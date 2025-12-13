#!/bin/bash
#
# Intelligent Automation System - Server Setup Script
# curl -fsSL https://install.gxqstudio.com | bash
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Detect OS and distribution
detect_os() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$ID
        OS_VERSION=$VERSION_ID
    else
        log_error "Cannot detect OS"
        exit 1
    fi
    
    log_info "Detected OS: $OS $OS_VERSION"
}

# Check system requirements
check_requirements() {
    log_info "Checking system requirements..."
    
    # Check if running as root
    if [ "$EUID" -ne 0 ]; then
        log_error "Please run as root or with sudo"
        exit 1
    fi
    
    # Check available memory (minimum 1GB)
    TOTAL_MEM=$(free -m | awk '/^Mem:/{print $2}')
    if [ "$TOTAL_MEM" -lt 1024 ]; then
        log_warn "System has less than 1GB RAM. Some features may not work properly."
    fi
    
    # Check disk space (minimum 10GB)
    FREE_SPACE=$(df -BG / | awk 'NR==2 {print $4}' | sed 's/G//')
    if [ "$FREE_SPACE" -lt 10 ]; then
        log_warn "Less than 10GB free disk space available."
    fi
    
    log_info "System requirements check completed"
}

# Update system packages
update_system() {
    log_info "Updating system packages..."
    
    case $OS in
        ubuntu|debian)
            apt-get update -y
            apt-get upgrade -y
            ;;
        centos|rhel|fedora)
            yum update -y
            ;;
        *)
            log_warn "Unknown OS. Skipping system update."
            ;;
    esac
}

# Install Docker
install_docker() {
    log_info "Installing Docker..."
    
    if command -v docker &> /dev/null; then
        log_info "Docker is already installed"
        return
    fi
    
    case $OS in
        ubuntu|debian)
            apt-get install -y apt-transport-https ca-certificates curl gnupg lsb-release
            curl -fsSL https://download.docker.com/linux/$OS/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
            echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/$OS $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
            apt-get update -y
            apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
            ;;
        centos|rhel|fedora)
            yum install -y yum-utils
            yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
            yum install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
            systemctl start docker
            systemctl enable docker
            ;;
    esac
    
    log_info "Docker installed successfully"
}

# Install Node.js using nvm
install_nodejs() {
    log_info "Installing Node.js..."
    
    if command -v node &> /dev/null; then
        log_info "Node.js is already installed: $(node -v)"
        return
    fi
    
    # Install nvm
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.5/install.sh | bash
    
    # Load nvm
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    
    # Install Node.js LTS
    nvm install --lts
    nvm use --lts
    
    log_info "Node.js installed: $(node -v)"
}

# Install Python
install_python() {
    log_info "Installing Python..."
    
    case $OS in
        ubuntu|debian)
            apt-get install -y python3 python3-pip python3-venv
            ;;
        centos|rhel|fedora)
            yum install -y python3 python3-pip
            ;;
    esac
    
    log_info "Python installed: $(python3 --version)"
}

# Install nginx
install_nginx() {
    log_info "Installing nginx..."
    
    if command -v nginx &> /dev/null; then
        log_info "nginx is already installed"
        return
    fi
    
    case $OS in
        ubuntu|debian)
            apt-get install -y nginx
            ;;
        centos|rhel|fedora)
            yum install -y nginx
            ;;
    esac
    
    systemctl start nginx
    systemctl enable nginx
    
    log_info "nginx installed and started"
}

# Install certbot for SSL certificates
install_certbot() {
    log_info "Installing certbot..."
    
    case $OS in
        ubuntu|debian)
            apt-get install -y certbot python3-certbot-nginx
            ;;
        centos|rhel|fedora)
            yum install -y certbot python3-certbot-nginx
            ;;
    esac
    
    log_info "certbot installed"
}

# Configure firewall
configure_firewall() {
    log_info "Configuring firewall..."
    
    if command -v ufw &> /dev/null; then
        ufw --force enable
        ufw allow 22/tcp
        ufw allow 80/tcp
        ufw allow 443/tcp
        ufw reload
        log_info "UFW firewall configured"
    elif command -v firewall-cmd &> /dev/null; then
        systemctl start firewalld
        systemctl enable firewalld
        firewall-cmd --permanent --add-service=ssh
        firewall-cmd --permanent --add-service=http
        firewall-cmd --permanent --add-service=https
        firewall-cmd --reload
        log_info "firewalld configured"
    else
        log_warn "No firewall detected. Please configure manually."
    fi
}

# Install essential tools
install_tools() {
    log_info "Installing essential tools..."
    
    case $OS in
        ubuntu|debian)
            apt-get install -y git curl wget build-essential vim
            ;;
        centos|rhel|fedora)
            yum groupinstall -y "Development Tools"
            yum install -y git curl wget vim
            ;;
    esac
    
    log_info "Essential tools installed"
}

# Main installation
main() {
    log_info "Starting Intelligent Automation System installation..."
    echo ""
    
    detect_os
    check_requirements
    update_system
    install_tools
    install_docker
    install_nodejs
    install_python
    install_nginx
    install_certbot
    configure_firewall
    
    echo ""
    log_info "Installation completed successfully!"
    log_info "You can now deploy your applications."
    echo ""
    log_info "Next steps:"
    echo "  1. Configure your domain DNS to point to this server"
    echo "  2. Run 'certbot --nginx -d yourdomain.com' to get SSL certificate"
    echo "  3. Deploy your application"
}

# Run main installation
main
