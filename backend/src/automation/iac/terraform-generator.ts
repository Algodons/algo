/**
 * Generate Terraform templates for cloud infrastructure
 */
export class TerraformGenerator {
  /**
   * Sanitize resource names for Terraform
   */
  private sanitizeResourceName(name: string): string {
    // Replace invalid characters with underscores and convert to lowercase
    return name.toLowerCase().replace(/[^a-z0-9_]/g, '_');
  }

  /**
   * Generate main Terraform configuration for AWS
   */
  generateAWS(appName: string, region: string = 'us-east-1'): string {
    const sanitizedName = this.sanitizeResourceName(appName);
    return `terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "${region}"
}

# VPC
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "${sanitizedName}-vpc"
  }
}

# Internet Gateway
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "${sanitizedName}-igw"
  }
}

# Subnets
resource "aws_subnet" "public" {
  count                   = 2
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.\${count.index}.0/24"
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name = "${sanitizedName}-public-\${count.index}"
  }
}

data "aws_availability_zones" "available" {
  state = "available"
}

# Security Group
resource "aws_security_group" "app" {
  name        = "${sanitizedName}-sg"
  description = "Security group for ${sanitizedName}"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${sanitizedName}-sg"
  }
}

# Load Balancer
resource "aws_lb" "main" {
  name               = "${sanitizedName}-lb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.app.id]
  subnets            = aws_subnet.public[*].id

  tags = {
    Name = "${sanitizedName}-lb"
  }
}

# Output
output "load_balancer_dns" {
  value = aws_lb.main.dns_name
}
`;
  }

  /**
   * Generate Terraform for DigitalOcean
   */
  generateDigitalOcean(appName: string, region: string = 'nyc3'): string {
    const sanitizedName = this.sanitizeResourceName(appName);
    return `terraform {
  required_providers {
    digitalocean = {
      source  = "digitalocean/digitalocean"
      version = "~> 2.0"
    }
  }
}

provider "digitalocean" {
  token = var.do_token
}

variable "do_token" {
  description = "DigitalOcean API token"
  type        = string
  sensitive   = true
}

# Droplet
resource "digitalocean_droplet" "${sanitizedName}" {
  image  = "ubuntu-22-04-x64"
  name   = "${sanitizedName}"
  region = "${region}"
  size   = "s-2vcpu-4gb"

  ssh_keys = [var.ssh_key_id]

  tags = ["${sanitizedName}", "production"]
}

variable "ssh_key_id" {
  description = "SSH key ID"
  type        = string
}

# Firewall
resource "digitalocean_firewall" "${sanitizedName}" {
  name = "${sanitizedName}-firewall"

  droplet_ids = [digitalocean_droplet.${sanitizedName}.id]

  inbound_rule {
    protocol         = "tcp"
    port_range       = "22"
    source_addresses = ["0.0.0.0/0"]
  }

  inbound_rule {
    protocol         = "tcp"
    port_range       = "80"
    source_addresses = ["0.0.0.0/0"]
  }

  inbound_rule {
    protocol         = "tcp"
    port_range       = "443"
    source_addresses = ["0.0.0.0/0"]
  }

  outbound_rule {
    protocol              = "tcp"
    port_range            = "1-65535"
    destination_addresses = ["0.0.0.0/0"]
  }
}

output "droplet_ip" {
  value = digitalocean_droplet.${sanitizedName}.ipv4_address
}
`;
  }
}
