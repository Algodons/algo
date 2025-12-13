#!/bin/bash

###############################################################################
# Disaster Recovery and Restore Script
# Provides point-in-time recovery from encrypted backups
###############################################################################

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_ROOT="${BACKUP_ROOT:-/var/backups/algo}"
LOG_FILE="${LOG_FILE:-/var/log/algo/restore.log}"

# Encryption settings
ENCRYPTION_KEY_FILE="${ENCRYPTION_KEY_FILE:-/etc/algo/backup.key}"

# Restore targets
RESTORE_DIR="${RESTORE_DIR:-/var/restore/algo}"
PROJECT_DIR="${PROJECT_DIR:-/home/runner/work/algo/algo}"
WORKSPACE_DIR="${WORKSPACE_DIR:-/var/lib/algo/workspaces}"

# Database settings
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-algo}"
DB_USER="${DB_USER:-algo}"
PGPASSWORD="${DB_PASSWORD:-}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

###############################################################################
# Logging functions
###############################################################################

log() {
    echo -e "[$(date +'%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

log_info() {
    log "${GREEN}[INFO]${NC} $*"
}

log_warn() {
    log "${YELLOW}[WARN]${NC} $*"
}

log_error() {
    log "${RED}[ERROR]${NC} $*"
}

log_step() {
    log "${BLUE}[STEP]${NC} $*"
}

###############################################################################
# Utility functions
###############################################################################

list_backups() {
    log_info "Available backups:"
    echo ""
    
    for backup_type in daily weekly monthly; do
        local dir="$BACKUP_ROOT/$backup_type"
        if [ -d "$dir" ]; then
            echo "=== $backup_type backups ==="
            find "$dir" -type f \( -name "*.tar.gz*" -o -name "*.sql.gz*" \) -printf "%T@ %Tc %p\n" | \
                sort -rn | \
                head -10 | \
                awk '{$1=""; print $0}'
            echo ""
        fi
    done
}

select_backup() {
    local backup_type="$1"
    local component="$2"  # project, database, workspaces
    
    log_info "Searching for $component backup in $backup_type..."
    
    local pattern
    case "$component" in
        project)
            pattern="project_*.tar.gz.enc"
            ;;
        database)
            pattern="database_*.sql.gz.enc"
            ;;
        workspaces)
            pattern="workspaces_*.tar.gz.enc"
            ;;
        *)
            log_error "Unknown component: $component"
            return 1
            ;;
    esac
    
    local backup_file
    backup_file=$(find "$BACKUP_ROOT/$backup_type" -name "$pattern" -type f | sort -r | head -1)
    
    if [ -z "$backup_file" ]; then
        log_error "No $component backup found in $backup_type"
        return 1
    fi
    
    echo "$backup_file"
}

verify_backup_integrity() {
    local backup_file="$1"
    local checksum_file="${backup_file}.sha256"
    
    log_info "Verifying backup integrity..."
    
    if [ ! -f "$checksum_file" ]; then
        log_warn "Checksum file not found, skipping verification"
        return 0
    fi
    
    if sha256sum -c "$checksum_file" >/dev/null 2>&1; then
        log_info "Backup integrity verified"
        return 0
    else
        log_error "Backup integrity check failed!"
        return 1
    fi
}

decrypt_backup() {
    local input_file="$1"
    local output_file="${input_file%.enc}"
    
    if [ ! -f "$ENCRYPTION_KEY_FILE" ]; then
        log_error "Encryption key not found: $ENCRYPTION_KEY_FILE"
        return 1
    fi
    
    log_info "Decrypting backup: $(basename "$input_file")"
    
    # Note: Using AES-256-CBC for compatibility with backup.sh
    # In production, consider upgrading to AES-256-GCM for authenticated encryption
    # or add HMAC verification to detect tampering
    openssl enc -aes-256-cbc -d -pbkdf2 \
        -in "$input_file" \
        -out "$output_file" \
        -pass file:"$ENCRYPTION_KEY_FILE" || {
        log_error "Failed to decrypt backup"
        return 1
    }
    
    log_info "Backup decrypted: $(basename "$output_file")"
    echo "$output_file"
}

###############################################################################
# Restore functions
###############################################################################

restore_project_code() {
    local backup_file="$1"
    local target_dir="${2:-$RESTORE_DIR/project}"
    
    log_step "Restoring project code..."
    
    # Verify integrity
    verify_backup_integrity "$backup_file" || return 1
    
    # Decrypt
    local decrypted_file
    decrypted_file=$(decrypt_backup "$backup_file") || return 1
    
    # Create restore directory
    mkdir -p "$target_dir"
    
    # Extract archive
    log_info "Extracting project files to: $target_dir"
    tar -xzf "$decrypted_file" -C "$target_dir" --strip-components=1 || {
        log_error "Failed to extract project files"
        rm -f "$decrypted_file"
        return 1
    }
    
    # Cleanup decrypted file
    rm -f "$decrypted_file"
    
    log_info "Project code restored successfully"
    return 0
}

restore_database() {
    local backup_file="$1"
    local drop_existing="${2:-false}"
    
    log_step "Restoring database..."
    
    # Verify integrity
    verify_backup_integrity "$backup_file" || return 1
    
    # Decrypt
    local decrypted_file
    decrypted_file=$(decrypt_backup "$backup_file") || return 1
    
    # Decompress
    local sql_file="${decrypted_file%.gz}"
    gunzip -c "$decrypted_file" > "$sql_file" || {
        log_error "Failed to decompress database backup"
        rm -f "$decrypted_file"
        return 1
    }
    
    # Export password
    export PGPASSWORD
    
    # Drop existing database if requested
    if [ "$drop_existing" = "true" ]; then
        log_warn "Dropping existing database..."
        psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres \
            -c "DROP DATABASE IF EXISTS $DB_NAME;" 2>/dev/null || true
        psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres \
            -c "CREATE DATABASE $DB_NAME;" || {
            log_error "Failed to create database"
            return 1
        }
    fi
    
    # Restore database
    log_info "Restoring database to: $DB_NAME"
    pg_restore -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        --verbose --clean --if-exists "$sql_file" || {
        log_error "Failed to restore database"
        rm -f "$decrypted_file" "$sql_file"
        return 1
    }
    
    # Cleanup
    rm -f "$decrypted_file" "$sql_file"
    
    log_info "Database restored successfully"
    return 0
}

restore_workspaces() {
    local backup_file="$1"
    local target_dir="${2:-$RESTORE_DIR/workspaces}"
    
    log_step "Restoring workspaces..."
    
    # Verify integrity
    verify_backup_integrity "$backup_file" || return 1
    
    # Decrypt
    local decrypted_file
    decrypted_file=$(decrypt_backup "$backup_file") || return 1
    
    # Create restore directory
    mkdir -p "$target_dir"
    
    # Extract archive
    log_info "Extracting workspaces to: $target_dir"
    tar -xzf "$decrypted_file" -C "$target_dir" --strip-components=1 || {
        log_error "Failed to extract workspaces"
        rm -f "$decrypted_file"
        return 1
    }
    
    # Cleanup
    rm -f "$decrypted_file"
    
    log_info "Workspaces restored successfully"
    return 0
}

###############################################################################
# Point-in-time recovery
###############################################################################

point_in_time_recovery() {
    local target_date="$1"
    
    log_step "Performing point-in-time recovery to: $target_date"
    
    # Find backups closest to target date
    local target_timestamp
    target_timestamp=$(date -d "$target_date" +%s)
    
    # This is a simplified implementation
    # In production, implement transaction log replay for true PITR
    log_warn "Point-in-time recovery requires transaction logs"
    log_info "Restoring from closest available backup..."
    
    # Find closest backup
    local closest_backup
    closest_backup=$(find "$BACKUP_ROOT" -type f -name "database_*.sql.gz.enc" -printf "%T@ %p\n" | \
        awk -v target="$target_timestamp" '{
            diff = (target - $1)
            if (diff >= 0 && diff < mindiff || mindiff == "") {
                mindiff = diff
                file = $2
            }
        } END {print file}')
    
    if [ -z "$closest_backup" ]; then
        log_error "No suitable backup found for date: $target_date"
        return 1
    fi
    
    log_info "Using backup: $(basename "$closest_backup")"
    restore_database "$closest_backup" "true"
}

###############################################################################
# Disaster recovery runbook
###############################################################################

disaster_recovery_full() {
    log_info "=========================================="
    log_info "FULL DISASTER RECOVERY"
    log_info "=========================================="
    
    local backup_type="${1:-daily}"
    
    # Create restore directory
    mkdir -p "$RESTORE_DIR"
    
    # Step 1: Restore project code
    log_step "Step 1: Restore project code"
    local project_backup
    project_backup=$(select_backup "$backup_type" "project") || return 1
    restore_project_code "$project_backup" || return 1
    
    # Step 2: Restore database
    log_step "Step 2: Restore database"
    local db_backup
    db_backup=$(select_backup "$backup_type" "database") || return 1
    restore_database "$db_backup" "true" || return 1
    
    # Step 3: Restore workspaces
    log_step "Step 3: Restore workspaces"
    local workspace_backup
    workspace_backup=$(select_backup "$backup_type" "workspaces")
    if [ -n "$workspace_backup" ]; then
        restore_workspaces "$workspace_backup" || log_warn "Workspace restore failed"
    else
        log_warn "No workspace backup found"
    fi
    
    log_info "=========================================="
    log_info "DISASTER RECOVERY COMPLETED"
    log_info "=========================================="
    log_info "Restored files location: $RESTORE_DIR"
    log_info ""
    log_info "Next steps:"
    log_info "1. Verify restored data"
    log_info "2. Update configuration files"
    log_info "3. Restart services"
    log_info "4. Test application functionality"
}

###############################################################################
# Main function
###############################################################################

main() {
    mkdir -p "$(dirname "$LOG_FILE")"
    
    case "${1:-}" in
        list)
            list_backups
            ;;
        restore-project)
            if [ -z "${2:-}" ]; then
                log_error "Usage: $0 restore-project <backup_file> [target_dir]"
                exit 1
            fi
            restore_project_code "$2" "${3:-}"
            ;;
        restore-database)
            if [ -z "${2:-}" ]; then
                log_error "Usage: $0 restore-database <backup_file> [drop_existing]"
                exit 1
            fi
            restore_database "$2" "${3:-false}"
            ;;
        restore-workspaces)
            if [ -z "${2:-}" ]; then
                log_error "Usage: $0 restore-workspaces <backup_file> [target_dir]"
                exit 1
            fi
            restore_workspaces "$2" "${3:-}"
            ;;
        pitr)
            if [ -z "${2:-}" ]; then
                log_error "Usage: $0 pitr <target_date>"
                exit 1
            fi
            point_in_time_recovery "$2"
            ;;
        full)
            disaster_recovery_full "${2:-daily}"
            ;;
        *)
            echo "Usage: $0 {list|restore-project|restore-database|restore-workspaces|pitr|full}"
            echo ""
            echo "Commands:"
            echo "  list                              - List available backups"
            echo "  restore-project <file> [dir]      - Restore project code"
            echo "  restore-database <file> [drop]    - Restore database"
            echo "  restore-workspaces <file> [dir]   - Restore workspaces"
            echo "  pitr <date>                       - Point-in-time recovery"
            echo "  full [backup_type]                - Full disaster recovery"
            exit 1
            ;;
    esac
}

main "$@"
