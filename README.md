# webapp

## Project Description (Assignment - A03)


This project is a cloud-native web application built using Node.js, designed to work with MySQL or PostgreSQL as a database server. It includes a health check endpoint and is ready to be deployed in a cloud environment.


### Requirements

Node.js.

npm.

Database Server (MySQL or PosgreSQL).

Any REST client like Postman or Restlet.

Build and Deploy Instructions

Clone the respository in your local machine using the git clone command.

Open a terminal and navigate to the location where the repository is cloned.

Run npm install. This will install all the dependencies from package.json.

Create a database in your local database server.

Create a .env file in the root directory of the project and copy the contents of .env-template file and fill the details for the fields in the file.

Run npm start in your terminal.

Open any REST client to do a health check by executing the healthz endpoint.



# packer-template.pkr.hcl

# Set up the required Packer plugin
packer {
  required_plugins {
    amazon = {
      source  = "hashicorp/amazon"
      version = ">= 1.0.0, <= 2.0.0"
    }
  }
}

# Define variables
variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "aws_instance_type" {
  type    = string
  default = "t2.small"
}

variable "mysql_root_password" {
  type    = string
  default = "MySQLStrongPassword"
}

# Define source image
source "amazon-ebs" "ubuntu" {
  ami_name      = "custom-ubuntu-24.04-mysql"
  instance_type = var.aws_instance_type
  region        = var.aws_region
  source_ami_filter {
    filters = {
      name                = "ubuntu/images/hvm-ssd/ubuntu-focal-24.04-amd64-server-*"
      virtualization-type = "hvm"
      root-device-type    = "ebs"
    }
    owners = ["099720109477"]  # Canonical's AWS account ID
    most_recent = true
  }
  ssh_username = "ubuntu"
  ami_block_device_mappings {
    device_name = "/dev/sda1"
    ebs {
      volume_size = 25
      delete_on_termination = true
      volume_type = "gp2"
    }
  }
}

# Build steps
build {
  sources = ["source.amazon-ebs.ubuntu"]

  provisioner "file" {
    source      = "setup_mysql.sh"
    destination = "/tmp/setup_mysql.sh"
  }

  provisioner "shell" {
    inline = [
      "chmod +x /tmp/setup_mysql.sh",
      "sudo /tmp/setup_mysql.sh"
    ]
  }

  post-processor "amazon-ami-management" {
    regions = [var.aws_region]
    ami_users = []  # Keep the AMI private
  }
}
