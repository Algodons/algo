#!/bin/bash

###############################################################################
# Automated Backup Script
# Performs daily automated backups of project code and databases
# Implements 30-day retention policy with encryption
###############################################################################

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="${CONFIG_FILE:-$SCRIPT_DIR/../config/backup-config.yaml}"
BACKUP_ROOT="${BACKUP_ROOT:-/var/backups/algo}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS="${RETENTION_DAYS:-30}"
LOG_FILE="${LOG_FILE:-/var/log/algo/backup.log}"

# Encryption settings
ENCRYPTION_ENABLED="${ENCRYPTION_ENABLED:-true}"
ENCRYPTION_KEY_FILE="${ENCRYPTION_KEY_FILE:-/etc/algo/backup.key}"

# Source directories
PROJECT_DIR="${PROJECT_DIR:-/home/runner/work/algo/algo}"
WORKSPACE_DIR="${WORKSPACE_DIR:-/var/lib/algo/workspaces}"

# Database settings
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-algo}"
DB_USER="${DB_USER:-algo}"
PGPASSWORD="${DB_PASSWORD:-}"

# Cloud storage settings
CLOUD_STORAGE_ENABLED="${CLOUD_STORAGE_ENABLED:-false}"
CLOUD_STORAGE_BUCKET="${CLOUD_STORAGE_BUCKET:-}"
CLOUD_STORAGE_REGION="${CLOUD_STORAGE_REGION:-us-east-1}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

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

###############################################################################
# Setup functions
###############################################################################

setup_backup_dirs() {
    log_info "Setting up backup directories..."
    
    mkdir -p "$BACKUP_ROOT"/{daily,weekly,monthly,archive}
    mkdir -p "$(dirname "$LOG_FILE")"
    
    chmod 700 "$BACKUP_ROOT"
    
    log_info "Backup directories ready"
}

###############################################################################
# Backup functions
###############################################################################

backup_project_code() {
    local backup_dir="$1"
    local backup_file="$backup_dir/project_${TIMESTAMP}.tar.gz"
    
    log_info "Backing up project code..."
    
    # Create compressed archive excluding node_modules and other build artifacts
    tar -czf "$backup_file" \
        -C "$(dirname "$PROJECT_DIR")" \
        --exclude='node_modules' \
        --exclude='dist' \
        --exclude='build' \
        --exclude='.git' \
        --exclude='*.log' \
        "$(basename "$PROJECT_DIR")" 2>/dev/null || {
        log_error "Failed to backup project code"
        return 1
    }
    
    log_info "Project code backed up to: $backup_file"
    echo "$backup_file"
}

backup_database() {
    local backup_dir="$1"
    local backup_file="$backup_dir/database_${TIMESTAMP}.sql.gz"
    
    log_info "Backing up PostgreSQL database..."
    
    # Export password for pg_dump
    export PGPASSWORD
    
    # Dump database with compression
    pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        --format=custom --compress=9 --verbose \
        --file="${backup_file%.gz}" 2>/dev/null || {
        log_error "Failed to backup database"
        return 1
    }
    
    # Additional gzip compression
    gzip "${backup_file%.gz}"
    
    log_info "Database backed up to: $backup_file"
    echo "$backup_file"
}

backup_workspaces() {
    local backup_dir="$1"
    local backup_file="$backup_dir/workspaces_${TIMESTAMP}.tar.gz"
    
    if [ ! -d "$WORKSPACE_DIR" ]; then
        log_warn "Workspace directory not found, skipping..."
        return 0
    fi
    
    log_info "Backing up user workspaces..."
    
    tar -czf "$backup_file" -C "$(dirname "$WORKSPACE_DIR")" "$(basename "$WORKSPACE_DIR")" 2>/dev/null || {
        log_warn "Failed to backup workspaces"
        return 1
    }
    
    log_info "Workspaces backed up to: $backup_file"
    echo "$backup_file"
}

encrypt_backup() {
    local input_file="$1"
    local output_file="${input_file}.enc"
    
    if [ "$ENCRYPTION_ENABLED" != "true" ]; then
        log_info "Encryption disabled, skipping..."
        echo "$input_file"
        return 0
    fi
    
    if [ ! -f "$ENCRYPTION_KEY_FILE" ]; then
        log_warn "Encryption key not found, creating new key..."
        openssl rand -base64 32 > "$ENCRYPTION_KEY_FILE"
        chmod 600 "$ENCRYPTION_KEY_FILE"
    fi
    
    log_info "Encrypting backup: $(basename "$input_file")"
    
    # Encrypt using AES-256-CBC
    openssl enc -aes-256-cbc -salt -pbkdf2 \
        -in "$input_file" \
        -out "$output_file" \
        -pass file:"$ENCRYPTION_KEY_FILE" || {
        log_error "Failed to encrypt backup"
        return 1
    }
    
    # Remove unencrypted file
    rm -f "$input_file"
    
    log_info "Backup encrypted: $(basename "$output_file")"
    echo "$output_file"
}

upload_to_cloud() {
    local file="$1"
    
    if [ "$CLOUD_STORAGE_ENABLED" != "true" ]; then
        log_info "Cloud storage disabled, skipping upload..."
        return 0
    fi
    
    if [ -z "$CLOUD_STORAGE_BUCKET" ]; then
        log_warn "Cloud storage bucket not configured"
        return 1
    fi
    
    log_info "Uploading to cloud storage: $(basename "$file")"
    
    # Upload to S3 (requires AWS CLI)
    if command -v aws &> /dev/null; then
        aws s3 cp "$file" "s3://$CLOUD_STORAGE_BUCKET/backups/$(basename "$file")" \
            --region "$CLOUD_STORAGE_REGION" \
            --storage-class STANDARD_IA || {
            log_error "Failed to upload to cloud storage"
            return 1
        }
        log_info "Successfully uploaded to cloud storage"
    else
        log_warn "AWS CLI not installed, skipping cloud upload"
    fi
}

verify_backup() {
    local file="$1"
    
    log_info "Verifying backup integrity: $(basename "$file")"
    
    # Check if file exists and is not empty
    if [ ! -f "$file" ] || [ ! -s "$file" ]; then
        log_error "Backup file is missing or empty"
        return 1
    fi
    
    # Calculate checksum
    local checksum
    checksum=$(sha256sum "$file" | awk '{print $1}')
    echo "$checksum  $file" > "${file}.sha256"
    
    log_info "Backup verified (SHA256: ${checksum:0:16}...)"
    return 0
}

###############################################################################
# Retention policy
###############################################################################

apply_retention_policy() {
    local backup_dir="$1"
    
    log_info "Applying retention policy (${RETENTION_DAYS} days)..."
    
    # Find and delete backups older than retention period
    find "$backup_dir" -type f -mtime +$RETENTION_DAYS -name "*.tar.gz*" -o -name "*.sql.gz*" | while read -r old_file; do
        log_info "Removing old backup: $(basename "$old_file")"
        rm -f "$old_file" "${old_file}.sha256" 2>/dev/null || true
    done
    
    # Archive backups older than 7 days to monthly
    if [ -d "$BACKUP_ROOT/daily" ]; then
        find "$BACKUP_ROOT/daily" -type f -mtime +7 -mtime -31 | while read -r file; do
            log_info "Archiving to monthly: $(basename "$file")"
            mv "$file" "$BACKUP_ROOT/monthly/" 2>/dev/null || true
        done
    fi
    
    log_info "Retention policy applied"
}

###############################################################################
# Main backup routine
###############################################################################

main() {
    log_info "=========================================="
    log_info "Starting backup process"
    log_info "=========================================="
    
    # Setup
    setup_backup_dirs
    
    # Determine backup directory (daily by default)
    local backup_type="${1:-daily}"
    local backup_dir="$BACKUP_ROOT/$backup_type"
    mkdir -p "$backup_dir"
    
    local backup_files=()
    local failed=0
    
    # Backup project code
    if project_backup=$(backup_project_code "$backup_dir"); then
        if encrypted_backup=$(encrypt_backup "$project_backup"); then
            if verify_backup "$encrypted_backup"; then
                backup_files+=("$encrypted_backup")
                upload_to_cloud "$encrypted_backup" || true
            else
                ((failed++))
            fi
        else
            ((failed++))
        fi
    else
        ((failed++))
    fi
    
    # Backup database
    if db_backup=$(backup_database "$backup_dir"); then
        if encrypted_backup=$(encrypt_backup "$db_backup"); then
            if verify_backup "$encrypted_backup"; then
                backup_files+=("$encrypted_backup")
                upload_to_cloud "$encrypted_backup" || true
            else
                ((failed++))
            fi
        else
            ((failed++))
        fi
    else
        ((failed++))
    fi
    
    # Backup workspaces
    if workspace_backup=$(backup_workspaces "$backup_dir"); then
        if [ -n "$workspace_backup" ]; then
            if encrypted_backup=$(encrypt_backup "$workspace_backup"); then
                if verify_backup "$encrypted_backup"; then
                    backup_files+=("$encrypted_backup")
                    upload_to_cloud "$encrypted_backup" || true
                else
                    ((failed++))
                fi
            else
                ((failed++))
            fi
        fi
    fi
    
    # Apply retention policy
    apply_retention_policy "$backup_dir"
    
    # Summary
    log_info "=========================================="
    log_info "Backup completed"
    log_info "Files backed up: ${#backup_files[@]}"
    log_info "Failed backups: $failed"
    log_info "=========================================="
    
    # Exit with error if any backup failed
    [ $failed -eq 0 ] && exit 0 || exit 1
}

# Run main function
main "$@"
