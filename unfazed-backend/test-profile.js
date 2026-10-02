const http = require("http");
const { loginTherapist } = require("./test-login");

async function testProfile() {
    const token = await loginTherapist();
    const options = {
        hostname: "localhost",
        port: 5000,
        path: "/api/auth/profile",
        method: "GET",
        headers: {
            "Authorization": `Bearer ${token}`
        }
    };

    await new Promise((resolve, reject) => {
        const request = http.request(options, (response) => {
            let result = "";

            response.on("data", (chunk) => {
                result += chunk;
            });

            response.on("end", () => {
                console.log("Status:", response.statusCode);
                console.log("Response:", result);

                if (response.statusCode !== 200) {
                    reject(new Error(`Profile request failed (${response.statusCode})`));
                    return;
                }

                resolve();
            });
        });

        request.on("error", reject);
        request.end();
    });
}

testProfile().catch((error) => {
    console.error("Profile test error:", error.message);
    process.exitCode = 1;
});