import request from "supertest";
import app from "./index.js";
import User from "./src/user/User.js";
import bcrypt from "bcrypt";

describe("Create an account and using GET, validate account exists", () => {
    test("should respond with a 200 status code", async () => {
        await request(app).post("/user/create-user").send({
            email: "jaygala25@gmail.com",
            password: "123456",
            firstName: "Jay",
            lastName: "Gala"
        });

        const response = await request(app).get("/user/get-user").auth("jaygala25@gmail.com", "123456")
        expect(response.status).toBe(200);
    })
});

describe("Update the account and using GET, validate the account was updated", () => {
    test("should respond with a 200 status code", async () => {
        await request(app).put("/user/update-user").auth("jaygala25@gmail.com", "123456").send({
            firstName: "Akshay",
            lastName: "Dedhia",
            password: "123456"
        });

        const response = await request(app).get("/user/get-user").auth("jaygala25@gmail.com", "123456")
        expect(response.status).toBe(200);
        expect(response.body.first_name).toBe("Akshay");
        expect(response.body.last_name).toBe("Dedhia");

        const result = await User.findOne({
            where: {
                email: "jaygala25@gmail.com"
            }
        })
        const passwordMatch = await bcrypt.compare("123456",result.dataValues.password);
        expect(passwordMatch).toBe(true);
    })
})

// // Close the database connection after all tests
// afterAll(async () => {
//     await sequelize.close(); // Adjust this if your Sequelize instance is named differently
// });
// Close the database connection after all tests
afterAll(async () => {
    await sequelize.close(); // Adjust this if your Sequelize instance is named differently
});