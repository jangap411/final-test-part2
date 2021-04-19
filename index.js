const express = require("express");
const cookieParser = require("cookie-parser");
const routes = require("./routes/routes.js");
const app = express();

app.set("view engine", "ejs");
app.use(express.static("public"));
app.use("/css", express.static(__dirname + "public/css"));
app.use("/images", express.static(__dirname + "public/images"));

app.use(cookieParser());
app.use(express.urlencoded({ extended: false }));

app.use(routes);

app.listen(9090, () => console.log("server running: 9090"));
