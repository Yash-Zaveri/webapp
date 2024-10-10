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
