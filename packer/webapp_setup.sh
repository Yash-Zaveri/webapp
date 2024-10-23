#!/bin/bash
set -e

echo "Updating package lists..."
sudo apt-get update

echo "Creating group 'csye6225' if it doesn't exist..."
if ! getent group csye6225 >/dev/null 2>&1; then
    sudo groupadd csye6225
fi

echo "Creating user 'csye6225' if it doesn't exist..."
if ! id -u csye6225 >/dev/null 2>&1; then
    sudo useradd -r -s /usr/sbin/nologin -g csye6225 csye6225
fi

echo "Installing Node.js..."
sudo apt-get install -y nodejs

echo "Installing npm..."
sudo apt-get install -y npm

echo "Installing unzip..."
sudo apt-get install -y unzip

echo "Checking if /tmp/webapp.zip exists..."
if [ -f "/tmp/webapp.zip" ]; then
    echo "File exists, proceeding with unzip..."
    sudo mkdir -p /opt/webapp
    sudo unzip /tmp/webapp.zip -d /opt/webapp
    echo "Setting ownership for /opt/webapp..."
    sudo chown -R csye6225:csye6225 /opt/webapp
else
    echo "webapp.zip does not exist in /tmp. Check file transfer steps or file permissions."
    exit 1
fi

echo "Navigating to webapp directory..."
cd /opt/webapp/webapp

rm -rf node_modules

npm install

npm install bcrypt@5.1.1

npm install dotenv

echo "Copying systemd service file and enabling the service..."
sudo cp /tmp/webapp.service /etc/systemd/system/webapp.service
sudo systemctl daemon-reload
sudo systemctl enable webapp.service

echo "Web application setup complete!"