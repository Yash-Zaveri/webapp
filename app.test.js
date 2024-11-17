import request from "supertest";
import app, { closeServer } from "./index.js";
import User from "./src/user/User.js";
import bcrypt from "bcrypt";
import sequelize from "./src/config/db.js"; 

// Negative Test Cases for User Routes
// describe("Negative test cases for user routes", () => {


//   test("should return 400 for missing fields during user creation", async () => {
//     const response = await request(app).post("/user/v1/create-user").send({
//       email: "incompleteuser@gmail.com",
//     });

//     expect(response.status).toBe(400); // Assuming 400 for bad request
//     //expect(response.body.message).toBe("Required fields missing");
//   });

//   test("should return 401 for incorrect credentials during GET", async () => {
//     await request(app).post("/user/v1/create-user").send({
//       email: "authuser@gmail.com",
//       password: "correctpassword",
//       firstName: "Auth",
//       lastName: "User",
//     });

//     const response = await request(app)
//       .get("/user/v1/get-user")
//       .auth("authuser@gmail.com", "wrongpassword");

//     expect(response.status).toBe(401); // Assuming 401 for unauthorized
//     //expect(response.body.message).toBe("Invalid credentials");
//   });

//   test("should return 404 when updating a non-existing user", async () => {
//     const response = await request(app)
//       .put("/user/v1/update-user")
//       .auth("nonexistentuser@gmail.com", "wrongpassword")
//       .send({
//         firstName: "New",
//         lastName: "Name",
//       });

//     expect(response.status).toBe(400);
//     //expect(response.body.message).toBe("User not found");
//   });
// });

// Test Case for the Healthz Endpoint
describe("Healthz endpoint tests", () => {
  test("should return 200 for a healthy database connection", async () => {
    const response = await request(app).get("/healthz");

    expect(response.status).toBe(200);
  });



});

// Close the server after all tests
afterAll((done) => {
  closeServer(done);
});
