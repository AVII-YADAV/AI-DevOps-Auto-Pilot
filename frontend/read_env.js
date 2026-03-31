const fs = require("fs");
const path = "e:/AI DevOps Auto-Pilot/frontend/.env.local";
if (fs.existsSync(path)) {
  const content = fs.readFileSync(path, 'utf16le');
  console.log(content);
} else {
  console.log("File not found");
}
