const http = require("http");
const crypto = require("crypto");

const data = JSON.stringify({
  email: `module1-test-${Date.now()}@example.com`,
  password: crypto.randomBytes(24).toString("base64url"),
  name: "Test Therapist",
  bio: "Test therapist profile",
  specializations: ["Anxiety", "Stress"],
  languages: ["English", "Kannada"]
});

const options = {
  hostname: "localhost",
  port: 5000,
  path: "/api/auth/register",
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
      console.error("Registration returned invalid JSON");
      process.exitCode = 1;
      return;
    }

    console.log("Status:", response.statusCode);
    if (response.statusCode !== 201 || !body.therapist?.slug) {
      console.error("Registration failed:", body.message || "generated slug missing");
      process.exitCode = 1;
      return;
    }

    console.log("Registration succeeded; generated profile slug:", body.therapist.slug);
  });
});

request.on("error", (error) => {
  console.error("Error:", error.message);
});

request.write(data);
request.end();