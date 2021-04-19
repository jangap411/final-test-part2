const { User, Message } = require("../models/models.js");
const jwt = require("jsonwebtoken");
const { Router } = require("express");
const router = Router();

let dataMsg = {
  msg: "",
};

router.get("/", async function (req, res) {
  let { token } = req.cookies;
  try {
    let vToken = jwt.verify(token, "theSecret");
    if (token) {
      let message = await Message.findAll({
        include: User,
        order: [["id", "DESC"]],
      });

      let data = { message };
      res.render("index", data);
    } else {
      dataMsg.msg = "Session token expired. please login again";
      res.redirect("/login");
    }
  } catch (e) {
    console.log("\nhome catch--->", e, "\n");
    dataMsg.msg = "Session token expired. please login again";
    res.redirect("/login");
  }
});

router.get("/createUser", function (req, res) {
  res.render("createUser");
});

router.post("/createUser", async function (req, res) {
  let { username, password } = req.body;

  try {
    let user = await User.create({
      username: username,
      password: password,
      role: "user",
    });

    if (user) {
      dataMsg.msg = "Account Created Please login";
      res.redirect("/login");
    } else {
      dataMsg.msg = "Error creating account";
      res.redirect("/login");
    }
  } catch (e) {
    console.log("\ncatch creating user", e, "\n");
  }
});

router.get("/login", function (req, res) {
  res.render("login", dataMsg);
});

router.post("/login", async function (req, res) {
  let { username, password } = req.body;

  try {
    let user = await User.findOne({
      where: { username },
    });

    if (user && user.password == password) {
      let data = {
        username: username,
        role: user.role,
        userid: user.id,
      };

      let token = jwt.sign(data, "theSecret", { expiresIn: "10m" });
      res.cookie("token", token);
      dataMsg.msg = "";
      res.redirect("/");
    } else {
      dataMsg.msg = "Invalid Username or password";
      res.redirect("/login");
    }
  } catch (e) {
    console.log("\ncatch login user", e, "\n");
  }
});

router.get("/message", async function (req, res) {
  let token = req.cookies.token;

  let verifyToken = jwt.verify(token, "theSecret");

  if (token) {
    res.render("message");
  } else {
    dataMsg.msg = "Session expired. please login";
    res.redirect("/login");
  }
});

router.post("/message", async function (req, res) {
  let { token } = req.cookies;
  console.log("\nreq.body----->", req.body, "\nreq.cookies", req.cookies, "\n");
  let { content } = req.body;
  let timeCreated = new Date();

  try {
    if (token) {
      let payload = jwt.verify(token, "theSecret");
      console.log("\nPayload verified:--->", payload, "\n");

      let user = await User.findOne({
        where: { id: payload.userid },
      });

      if (user) {
        let msg = await Message.create({
          content: content,
          time: timeCreated.toLocaleTimeString(),
          UserId: user.id,
        });

        if (msg) {
          res.redirect("/");
        } else {
          res.redirect("/error");
        }
      } else {
        res.redirect("/login");
      }
    } else {
    }
  } catch (e) {
    console.error("\nCatch create message --->", e, "\n");
    dataMsg.msg = "Session token expired. please login again";
    res.redirect("/error");
  }
});

router.get("/error", function (req, res) {
  res.render("error");
});

// router.all("*", function (req, res) {
//   res.send("404 dude");
// });

router.post("/like", async (req, res) => {
  let { id } = req.body;
  console.log("like");

  let message = await Message.findOne({ where: { id: id } });

  if (message) {
    let like = await Message.update(
      {
        likes: parseInt(message.likes) + 1,
      },
      {
        where: { id: message.id },
        returning: true,
        plain: true,
      }
    );
    if (like) {
      res.redirect("/");
    } else {
      res.send("error");
    }
  }
});

router.get("/logout", (req, res) => {
  const { token } = req.cookies;
  // const authHeader = req.headers.Authorization;

  console.log("\ntoken cookie-->", token, "\n");

  // const token = authHeader && authHeader.split(" ")[1];
  console.log("\ntoken Middleware", token, "\n");
  let payload = jwt.verify(token, "theSecret");
  res.cookie(payload, { expires: new Date(Date.now() - 100) });

  res.redirect("/login");
});

module.exports = router;
