#!/bin/bash
#weapp_mysql.sh
# Exit on any error
set -e

echo "Updating package lists..."
sudo apt-get update

# Ensure group and user creation before anything else
echo "Creating group 'csye6225' if it doesn't exist..."
if ! getent group csye6225 >/dev/null 2>&1; then
    sudo groupadd csye6225
    echo "Group 'csye6225' created."
else
    echo "Group 'csye6225' already exists."
fi

echo "Creating user 'csye6225' if it doesn't exist..."
if ! id -u csye6225 >/dev/null 2>&1; then
    sudo useradd -r -s /usr/sbin/nologin -g csye6225 csye6225
    echo "User 'csye6225' created."
else
    echo "User 'csye6225' already exists."
fi

# Install required packages
echo "Installing Node.js..."
sudo apt-get install -y nodejs

echo "Installing npm..."
sudo apt-get install -y npm

echo "Installing unzip..."
sudo apt-get install -y unzip

echo "Installing MySQL Server..."
sudo apt-get install -y mysql-server

echo "Starting MySQL service..."
sudo systemctl enable mysql
sudo systemctl start mysql

# Setting up MySQL database
echo "Setting up MySQL database..."
sudo mysql <<EOF
CREATE DATABASE IF NOT EXISTS myapp_db;
CREATE USER 'yash'@'localhost' IDENTIFIED BY 'Yash@2002';
GRANT ALL PRIVILEGES ON *.* TO 'yash'@'localhost' WITH GRANT OPTION;
FLUSH PRIVILEGES;
EOF

# ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '';
# FLUSH PRIVILEGES;
# File existence and unzipping
echo "Checking if /tmp/webapp.zip exists..."
if [ -f "/tmp/webapp.zip" ]; then
    echo "File exists, proceeding with unzip..."
    sudo mkdir -p /opt/webapp
    sudo unzip /tmp/webapp.zip -d /opt/webapp
    echo "Setting ownership for /opt/webapp..."
    sudo chown -R csye6225:csye6225 /opt/webapp
    # sudo mkdir -p /opt/webapp
    # sudo mv /tmp/webapp.zip /opt/webapp/
    # sudo unzip /opt/webapp/webapp.zip -d /opt/webapp
    # echo "Setting ownership for /opt/webapp..."
    # sudo chown -R csye6225:csye6225 /opt/webapp

else
    echo "webapp.zip does not exist in /tmp. Check file transfer steps or file permissions."
    exit 1
fi

# Create environment file
echo "Creating .env file in the webapp directory..."
cat <<EOF > /opt/webapp/webapp/.env
MYSQL_HOST=127.0.0.1
MYSQL_USER=yash
MYSQL_PASSWORD=Yash@2002
MYSQL_DATABASE=myapp_db
PORT=5000
EOF

# Navigate to webapp directory and install dependencies
echo "Navigating to webapp directory..."
cd /opt/webapp/webapp

rm -rf node_modules

npm install

npm install bcrypt@5.1.1

npm install dotenv

# echo "Installing Node.js dependencies..."
# npm install

# Setup systemd service
echo "Copying systemd service file and enabling the service..."
sudo cp /tmp/webapp.service /etc/systemd/system/webapp.service
sudo systemctl daemon-reload
sudo systemctl enable webapp.service
sudo systemctl start webapp.service

# Check service status
echo "Checking the status of the application service..."
sudo systemctl status webapp.service --no-pager

echo "Web application setup complete!"


