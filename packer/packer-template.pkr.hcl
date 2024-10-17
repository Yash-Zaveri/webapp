
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
  default = "t2.small"
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
  default = "subnet-0330eac9e146451ca"  # Check your actual subnet ID
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
  # profile = "Assignment"
  instance_type   = var.instance_type
  source_ami      = var.source_ami
  ssh_username    = var.ssh_username
  subnet_id       = var.subnet_id
  ami_regions     = ["us-east-1"]

  # Reference variables for AWS credentials
  access_key             = var.AWS_ACCESS_KEY_ID
  secret_key             = var.AWS_SECRET_ACCESS_KEY

  tags = {
    Name        = "CSYE6225_Custom_AMI"
    Environment = "dev"
  }

  run_tags = {
    BuildBy = "Packer"
  }

  aws_polling {
    delay_seconds = 120
    max_attempts  = 50
  }

  launch_block_device_mappings {
    device_name          = "/dev/sda1"
    volume_size          = 25
    volume_type          = "gp2"
    delete_on_termination = true
  }
}

build {
  sources = ["source.amazon-ebs.ubuntu-ami"]

  # Transfer the application zip file
  provisioner "file" {
    source      = "/home/runner/work/webapp/webapp/webapp.zip"  # Update the path to your zip file
    destination = "/tmp/webapp.zip"
  }

  # Transfer the systemd service file
  provisioner "file" {
    source      = "/home/runner/work/webapp/webapp/packer/webapp.service"  # Update the path to your .service file
    destination = "/tmp/webapp.service"
  }

  # Transfer the install script
  provisioner "file" {
    source      = "/home/runner/work/webapp/webapp/packer/weapp_mysql.sh"  # Update the path to your install script
    destination = "/tmp/weapp_mysql.sh"
  }

  # Run the install script, which will handle user creation, MySQL setup, application setup, and systemd service setup
  provisioner "shell" {
    inline = [
      "echo 'Setting up and running the weapp_mysql.sh script...'",
      "chmod +x /tmp/weapp_mysql.sh",
      "sudo /tmp/weapp_mysql.sh"
    ]
  }

   
}

