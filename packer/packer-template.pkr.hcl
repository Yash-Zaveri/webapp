packer {
  required_plugins {
    amazon = {
      version = ">= 1.0.0"
      source  = "github.com/hashicorp/amazon"
    }
  }
}

variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "instance_type" {
  type    = string
  default = "t2.micro"
}

variable "source_ami" {
  type    = string
  default = "ami-0cad6ee50670e3d0e" # Your Ubuntu 24.04 LTS AMI ID
}

variable "ssh_username" {
  type    = string
  default = "ubuntu"
}

variable "subnet_id" {
  type    = string
  default = "subnet-01363cf083f361622" # Check your actual subnet ID {Demo account}
  # default = "subnet-0330eac9e146451ca" # Dev account
}

variable "AWS_ACCESS_KEY_ID" {
  description = "AWS Access Key ID"
}

variable "AWS_SECRET_ACCESS_KEY" {
  description = "AWS Secret Access Key"
}

source "amazon-ebs" "ubuntu-ami" {
  region          = var.aws_region
  ami_name        = "csye6225_custom_ami_${formatdate("YYYYMMDDHHmmss", timestamp())}"
  ami_description = "Custom Ubuntu AMI with Node.js"
  instance_type   = var.instance_type
  source_ami      = var.source_ami
  ssh_username    = var.ssh_username
  subnet_id       = var.subnet_id
  ami_regions     = ["us-east-1"]

  access_key = var.AWS_ACCESS_KEY_ID
  secret_key = var.AWS_SECRET_ACCESS_KEY

  tags = {
    Name        = "CSYE6225_Custom_AMI"
    Environment = "dev"
    CreatedBy   = "GitUser"
  }

  run_tags = {
    BuildBy = "Packer"
  }

  aws_polling {
    delay_seconds = 120
    max_attempts  = 50
  }

  launch_block_device_mappings {
    device_name           = "/dev/sda1"
    volume_size           = 25
    volume_type           = "gp2"
    delete_on_termination = true
  }
}

build {
  sources = ["source.amazon-ebs.ubuntu-ami"]

  provisioner "file" {
    source      = "packer/webapp.zip"
    destination = "/tmp/webapp.zip"
    generated   = true
  }

  provisioner "file" {
    source      = "packer/webapp.service"
    destination = "/tmp/webapp.service"
  }

  provisioner "file" {
    source      = "packer/webapp_setup.sh"
    destination = "/tmp/webapp_setup.sh"
  }

  # New file provisioner for CloudWatch config

  provisioner "file" {
    source      = "packer/cloudwatch-config.json"
    destination = "/tmp/cloudwatch-config.json"
  }

  provisioner "shell" {
    inline = [
      "echo 'Setting up and running the webapp_setup.sh script...'",
      "chmod +x /tmp/webapp_setup.sh",
      "sudo /tmp/webapp_setup.sh"
    ]
  }

  post-processor "manifest" {
    output     = "packer-manifest.json"
    strip_path = true
  }
}