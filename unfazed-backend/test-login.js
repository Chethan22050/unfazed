const http = require("http");
require("dotenv").config({ quiet: true });

const email = process.env.TEST_THERAPIST_EMAIL;
const password = process.env.TEST_THERAPIST_PASSWORD;

function loginTherapist() {
    if (!email || !password) {
        return Promise.reject(new Error("Set TEST_THERAPIST_EMAIL and TEST_THERAPIST_PASSWORD in the environment"));
    }

    const data = JSON.stringify({ email, password });
    return new Promise((resolve, reject) => {
        const options = {
            hostname: "localhost",
            port: 5000,
            path: "/api/auth/login",
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(data)
            }
        };

        const request = http.request(options, (response) => {
            let result = "";

            response.on("data", (chunk) => {
                result += chunk;
            });

            response.on("end", () => {
                let body;
                try {
                    body = JSON.parse(result);
                } catch {
                    reject(new Error("Login returned an invalid JSON response"));
                    return;
                }

                if (response.statusCode !== 200 || typeof body.token !== "string") {
                    reject(new Error(`Login failed (${response.statusCode}): ${body.message || "token missing"}`));
                    return;
                }

                resolve(body.token);
            });
        });

        request.on("error", reject);
        request.write(data);
        request.end();
    });
}

if (require.main === module) {
    loginTherapist()
        .then(() => console.log("Login successful; JWT captured from response."))
        .catch((error) => {
            console.error("Login error:", error.message);
            process.exitCode = 1;
        });
}

module.exports = { loginTherapist };