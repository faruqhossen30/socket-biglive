#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const { program } = require("commander");

program
  .command("make:module <name>")
  .description("Create a new module")
  .action((name) => {
    const modulePath = path.join(__dirname, "../modules", name);
    if (fs.existsSync(modulePath)) {
      console.log("❌ Module already exists!");
      return;
    }
    fs.mkdirSync(modulePath, { recursive: true });
    fs.mkdirSync(path.join(modulePath, "controllers"));
    fs.mkdirSync(path.join(modulePath, "services"));
    fs.mkdirSync(path.join(modulePath, "models"));
    fs.mkdirSync(path.join(modulePath, "routes"));

    fs.writeFileSync(
      path.join(modulePath, "controllers", `${name}.controller.js`),
      `class ${capitalize(name)}Controller {}
module.exports = ${capitalize(name)}Controller;`
    );

    fs.writeFileSync(
      path.join(modulePath, "services", `${name}.service.js`),
      `class ${capitalize(name)}Service {}
module.exports = ${capitalize(name)}Service;`
    );

    fs.writeFileSync(
      path.join(modulePath, "routes", `${name}.routes.js`),
      `const express = require("express");
const router = express.Router();
// const Controller = require("../controllers/${name}.controller");
module.exports = router;`
    );

    console.log(`✅ Module ${name} created successfully!`);
  });

program.parse(process.argv);

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
