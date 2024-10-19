# installDependencies.sh

cd /opt/webapp || { echo "Directory not found"; exit 1; }

rm -rf node_modules

npm install

npm install bcrypt@5.1.1

npm install dotenv

