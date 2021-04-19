const { User, Message } = require("../models/models.js");
const jwt = require("jsonwebtoken");
const { Router } = require("express");
const router = Router();

let dataMsg = {
  msg: "",
};

router.get("/", async function (req, res) {
  let { token } = req.cookies;
  // add try block to catch any errors that occur in during the async function calls
  try {
    //adds an if block that check if the user's session token is valid else direct the user to
    //the login page and displays a message to the user, "Session token expired. please login again"
    if (token) {
      //makes an ansyc call to the db for all the messages that includes the users who created the messages
      // and displays them descendingly on the home, that is, the latest message created will be on the
      //top of the list
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
    //catch any errors that may occur and redirct to login page
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

    /*
    adds an if block that check if a new user is created and redirects to the login page and displays
    a message, "Account Created Please login", if the account is created successfully
    */
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

    /*
    moves the if block from line 50 on the original code base into the try block.
    since the async call to the db for the user only exist with in the try block, it prevents the 
    user to login and the webpage hangs. therefore, moving the if statement up allowing the user to
    login, and redirects the page accordingly.
    */

    if (user && user.password == password) {
      let data = {
        username: username,
        role: user.role,
        //adds userid field to the data be signed by jwt so it be accessed later on, when the user
        //wants to create a new message
        userid: user.id,
      };

      /*
      set expiration for jwt token to expires in 10 minutes, so the user login after the their 
      sessions expires.
      NB: the expiration is set to 10 minutes for testing purposes, but it can be set to a larger
      duration.

      */
      let token = jwt.sign(data, "theSecret", { expiresIn: "10m" });
      res.cookie("token", token);
      dataMsg.msg = "";
      res.redirect("/");
    } else {
      /*
      if the username or password does not match the one in the db, displays an error message,
      "Invalid Username or password", to the user
      */
      dataMsg.msg = "Invalid Username or password";
      res.redirect("/login");
    }
  } catch (e) {
    console.log("\ncatch login user", e, "\n");
  }
});

router.get("/message", async function (req, res) {
  let token = req.cookies.token;

  if (token) {
    res.render("message");
  } else {
    /*
    if users' expires redirects to the login page and displays error message
    */
    dataMsg.msg = "Session expired. please login";
    res.redirect("/login");
  }
});

router.post("/message", async function (req, res) {
  let { token } = req.cookies;
  let { content } = req.body;
  /*
  create for a variable for the created time. Since time attribute exists in the message model
  in the models.js file
  */
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
          //inserts the created time to the db, in the original code base it inserts a null value
          time: timeCreated.toLocaleTimeString(),
          /*
          fix the typo to match the one in the db.
          the original code base has this written as userId, which inserts a null value to this field
          in the messages table. therefore, changing it from userId to UserId, to fix that issue.
          */
          UserId: user.id,
        });

        /*
        adds an if block that checks if the query executes successfully and redirects the 
        page accordingly
        */
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
    //redirects the error page if an error occurs
    dataMsg.msg = "Session token expired. please login again";
    res.redirect("/error");
  }
});

router.get("/error", function (req, res) {
  res.render("error");
});

/*
I commented out is block of code because its preventing my like messages use case from executing
successfully, and created custom error messages and redirects to compensate for this block of code
*/

// router.all("*", function (req, res) {
//   res.send("404 dude");
// });

/*
adds post route for the likes function, when the user clicks the like
button this endpoint is hit
*/
router.post("/like", async (req, res) => {
  //gets the message id from the request body so the right message gets the like
  let { id } = req.body;
  console.log("like");

  /*
  makes an async call to the db for the message with the corresponding id from the request body
  */
  let message = await Message.findOne({ where: { id: id } });

  /*
  checks if the query is successfully, updates the likes column in the messages table,
  else redirect to the error page
  */
  if (message) {
    /*
    updates the like value in the db by adding 1 to the existng value in the db.
    where the id is equal to the id of the message in the above query. set the returning and plain attribute
    to true so it returns bool value back instead of an empty array
    */
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

    /*
    if block checks if the update query is successful and redirects the page accordingly.
    */
    if (like) {
      res.redirect("/");
    } else {
      res.send("error");
    }
  }
});

/*
logout route, redirects to the login page
and sets the cookie epiration be 100 seconds ago,
basically deletig the cookie from the clients browser
*/
router.get("/logout", (req, res) => {
  //gets the session cookies
  const { token } = req.cookies;
  //set expiration to a time in the past (100 sec)
  res.cookie("token", token, { expires: new Date(Date.now() - 100) });
  //redirects to login age
  res.redirect("/login");
});

module.exports = router;
