const express = require("express");
const expressHandlebars = require("express-handlebars");
const bodyParser = require("body-parser");
const sqlite3 = require("sqlite3");
const expressSession = require("express-session");

const minTitleLength = 1;
const minTextLength = 19;

const minNameLength = 2;
const minMessageLength = 10;

const minNoteLength = 3;
const minDateLength = 5;

const db = new sqlite3.Database("myLifeAsW-database.db");

db.run(`
    CREATE TABLE IF NOT EXISTS posts(
      id INTEGER PRIMARY KEY,
      title TEXT,
      mainText TEXT
    )
`);

db.run(`
      CREATE TABLE IF NOT EXISTS guests(
        id INTEGER PRIMARY KEY,
        name TEXT,
        surname TEXT,
        message TEXT
      )
`);

db.run(`
        CREATE TABLE IF NOT EXISTS affirmation(
          id INTEGER PRIMARY KEY,
          date INTEGER,
          note TEXT
        )
`);

const app = express();

app.use(
  expressSession({
    secret: "bfacgoeuygf",
    saveUninitialized: false,
    resave: false,
  })
);

const correctUsername = "weronika";
const correctPassword = "weronika2305";

app.use(express.static("public"));

app.use(
  bodyParser.urlencoded({
    extended: false,
  })
);

app.engine(
  "hbs",
  expressHandlebars.engine({
    defaultLayout: "main.hbs",
  })
);

app.use(function (request, response, next) {
  const isLoggedIn = request.session.isLoggedIn;

  response.locals.isLoggedIn = isLoggedIn;

  next();
});

app.get("/", function (request, response) {
  response.render("home.hbs");
});

app.get("/posts", function (request, response) {
  const query = "SELECT * FROM posts ORDER BY id";

  db.all(query, function (error, posts) {
    if (error) {
      console.log(error);

      const model = {
        dbError: true,
      };
      response.render("posts.hbs", model);
    } else {
      const model = {
        posts: posts,
        dbError: false,
      };
      response.render("posts.hbs", model);
    }
  });
});

app.get("/contact", function (request, response) {
  response.render("contact.hbs");
});

app.get("/create", function (request, response) {
  if (request.session.isLoggedIn) {
    response.render("create.hbs");
  } else {
    response.redirect("/login");
  }

  response.render("create.hbs");
});

function getValidationErrorsForPost(title, mainText) {
  const validationErrors = [];

  if (title.length <= minTitleLength) {
    validationErrors.push(
      "Title must contain at least " + minTitleLength + " characters."
    );
  }

  if (mainText.length <= minTextLength) {
    validationErrors.push(
      "Text must contain at leats " + minTextLength + " characters."
    );
  }

  return validationErrors;
}

app.post("/create", function (request, response) {
  const title = request.body.title;
  const mainText = request.body.mainText;

  const errors = getValidationErrorsForPost(title, mainText);

  if (!request.session.isLoggedIn) {
    errors.push("You have to login!");
  }

  if (errors.length == 0) {
    const query = `
      INSERT INTO posts (title, mainText) VALUES(?, ?)
      `;
    const values = [title, mainText];

    db.run(query, values, function (error) {
      if (error) {
        console.log(error);
        //Display error
      } else {
        response.redirect("/posts/" + this.lastID);
      }
    });
  } else {
    const model = {
      errors,
      title,
      mainText,
    };
    response.render("create.hbs", model);
  }
});

//update post

app.get("/update-post/:id", function (request, response) {
  const id = request.params.id;

  const query = "SELECT * FROM posts WHERE id = ?";
  const values = [id];

  if (request.session.isLoggedIn) {
    db.get(query, values, function (error, post) {
      if (error) {
        console.log(error);
        //display error message.
      } else {
        const model = {
          post,
        };
        response.render("update-post.hbs", model);
      }
    });
  } else {
    response.redirect("/login");
  }
});

app.post("/update-post/:id", function (request, response) {
  const id = request.params.id;
  const newTitle = request.body.title;
  const newMainText = request.body.mainText;

  const validationErrors = getValidationErrorsForPost(newTitle, newMainText);

  if (!request.session.isLoggedIn) {
    errors.push("You have to login!");
  }

  if (validationErrors.length == 0) {
    const query = `
        UPDATE
          posts
        SET
          title = ?,
          mainText = ?
        WHERE
          id = ?
            `;

    const values = [newTitle, newMainText, id];

    db.run(query, values, function (error) {
      if (error) {
        console.log(error);
        //Display error
      } else {
        response.redirect("/posts/" + id);
      }
    });
  } else {
    const model = {
      post: {
        id,
        title: newTitle,
        mainText: newMainText,
      },
      validationErrors,
    };
    response.render("update-post.hbs", model);
  }
});

//delete post

app.post("/delete-post/:id", function (request, response) {
  const id = request.params.id;
  const query = "DELETE FROM posts WHERE id = ?";
  const values = [id];

  db.run(query, values, function (error) {
    if (error) {
      console.log(error);
      //display error
    } else {
      response.redirect("/posts");
    }
  });
});

app.get("/posts/:id", function (request, response) {
  const id = request.params.id;
  const query = `SELECT * FROM posts WHERE id = ?`;
  const values = [id];

  db.get(query, values, function (error, post) {
    if (error) {
      console.log(error);
      //Dispplay error
    } else {
      const model = {
        post: post,
      };

      response.render("post.hbs", model);
    }
  });
});

//Login page
app.get("/login", function (request, response) {
  response.render("login.hbs");
});

app.post("/login", function (request, response) {
  const enteredUsername = request.body.username;
  const enteredPassword = request.body.password;

  if (
    enteredUsername == correctUsername &&
    enteredPassword == correctPassword
  ) {
    //Login

    request.session.isLoggedIn = true;
    response.redirect("/");
  } else {
    //display error message
    response.redirect("/posts");
  }
});

//log out page

app.post("/logout", function (request, response) {
  request.session.isLoggedIn = false;
  response.redirect("/");
});

//guests

app.get("/guests", function (request, response) {
  const query = "SELECT * FROM guests";

  db.all(query, function (error, guests) {
    if (error) {
      console.log(error);

      const model = {
        dbError: true,
      };

      response.render("guests.hbs", model);
    } else {
      const model = {
        guests,
        dbError: false,
      };
      response.render("guests.hbs", model);
    }
  });
});

app.get("/guests/:id", function (request, response) {
  const id = request.params.id;

  const query = "SELECT * FROM guests WHERE id =?";
  const values = [id];

  db.get(query, values, function (error, guest) {
    if (error) {
      console.log(error);
      //display error
    } else {
      const model = {
        guest: guest,
      };
      response.render("guest.hbs", model);
    }
  });
});

app.get("/create-guest", function (request, response) {
  response.render("create-guest.hbs");
});

function getValidationErrorsForGuest(name, surname, message) {
  const validationErrors = [];

  if (name.length <= minNameLength) {
    validationErrors.push(
      "Name must contain at least " + minNameLength + " characters!"
    );
  }
  if (surname.length <= minNameLength) {
    validationErrors.push(
      "Surname can not be shorter that " + minNameLength + " characters!"
    );
  }

  if (message.length <= minMessageLength) {
    validationErrors.push(
      "Message can not be shorter that " + minMessageLength + " characters"
    );
  }
  return validationErrors;
}

app.post("/create-guest", function (request, response) {
  const name = request.body.name;
  const surname = request.body.surname;
  const message = request.body.message;

  const errors = getValidationErrorsForGuest(name, surname, message);

  if (errors.length == 0) {
    const query = `
        INSERT INTO guests (name, surname, message) VALUES (?, ?, ?)
        `;
    const values = [name, surname, message];

    db.run(query, values, function (error) {
      if (error) {
        console.log(error);
        //Display error
      } else {
        response.redirect("/guests/" + this.lastID);
      }
    });
  } else {
    const model = {
      errors,
      name,
      surname,
      message,
    };
    response.render("create-guest.hbs", model);
  }
});

//update guest

app.get("/update-guest/:id", function (request, response) {
  const id = request.params.id;
  const query = "SELECT * FROM guests WHERE id = ?";
  const values = [id];

  if (request.session.isLoggedIn) {
    db.get(query, values, function (error, guest) {
      if (error) {
        console.log(error);
        //dispaly error
      } else {
        const model = {
          guest,
        };
        response.render("update-guest.hbs", model);
      }
    });
  } else {
    response.redirect("/login");
  }
});

app.post("/update-guest/:id", function (request, response) {
  const id = request.params.id;
  const newName = request.body.name;
  const newSurname = request.body.surname;
  const newMessage = request.body.message;

  const validationErrors = getValidationErrorsForGuest(
    newName,
    newSurname,
    newMessage
  );

  if (!request.session.isLoggedIn) {
    errors.push("You have to login!");
  }

  if (validationErrors.length == 0) {
    const query = `
    UPDATE
      guests
    SET
      name = ?,
      surname = ?,
      message = ?
    WHERE
      id = ?
    `;
    const values = [newName, newSurname, newMessage, id];

    db.run(query, values, function (error) {
      if (error) {
        console.log(error);
        //dispaly error
      } else {
        response.redirect("/guests/" + id);
      }
    });
  } else {
    const model = {
      guest: {
        id,
        name: newName,
        surname: newSurname,
        message: newMessage,
      },
      validationErrors,
    };
    response.render("update-guest.hbs", model);
  }
});

//delete guest

app.post("delete-guest/:id", function (request, response) {
  const id = request.params.id;
  const query = "DELETE FROM guests WHERE id = ?";
  const values = [id];

  db.run(query, values, function (error) {
    if (error) {
      console.log(error);
      //display error
    } else {
      response.redirect("/guests");
    }
  });
});

//quotes

app.get("/affirmations", function (request, response) {
  const query = "SELECT * FROM affirmation";

  db.all(query, function (error, affirmations) {
    if (error) {
      console.log(error);

      const model = {
        dbError: true,
      };

      response.render("affirmations.hbs", model);
    } else {
      const model = {
        affirmations,
        dbError: false,
      };
      response.render("affirmations.hbs", model);
    }
  });
});

app.get("/affirmations/:id", function (request, response) {
  const id = request.params.id;

  const query = "SELECT * FROM affirmation WHERE id=?";
  const values = [id];

  db.get(query, values, function (error, affirmation) {
    if (error) {
      console.log(error);
      //display error
    } else {
      const model = {
        affirmation: affirmation,
      };
      response.render("affirmation.hbs", model);
    }
  });
});

app.get("/create-affirmation", function (request, response) {
  response.render("create-affirmation.hbs");
});

function getValidationErrorsForAffirmations(date, note) {
  const validationErrors = [];

  if (note.length <= minNoteLength) {
    validationErrors.push(
      "Quote must contain at least " + minNoteLength + " characters!"
    );
  }
  if (date.length <= minDateLength) {
    ("Remember to choose a date!");
  }
  return validationErrors;
}

app.post("/create-affirmation", function (request, response) {
  const date = request.body.date;
  const note = request.body.note;

  const errors = getValidationErrorsForAffirmations(date, note);

  if (errors.length == 0) {
    const query = `
    INSERT INTO affirmation (date, note) VALUES(?, ?)
    `;
    const values = [date, note];

    db.run(query, values, function (error) {
      if (error) {
        console.log(error);
        //display error
      } else {
        response.redirect("/affirmations/" + this.lastID);
      }
    });
  } else {
    const model = {
      errors,
      date,
      note,
    };
    response.render("create-affirmation.hbs", model);
  }
});

//update affirmation

app.get("/update-affirmation/:id", function (request, response) {
  const id = request.params.id;
  const query = "SELECT * FROM affirmation WHERE id = ?";
  const values = [id];

  if (request.session.isLoggedIn) {
    db.get(query, values, function (error, affirmation) {
      if (error) {
        console.log(error);
        //display error
      } else {
        const model = {
          affirmation,
        };
        response.render("update-affirmation.hbs", model);
      }
    });
  } else {
    response.redirect("/login");
  }
});

app.post("/update-affirmation/:id", function (request, response) {
  const id = request.params.id;
  const newDate = request.body.date;
  const newNote = request.body.note;

  const validationErrors = getValidationErrorsForAffirmations(newDate, newNote);

  if (!request.session.isLoggedIn) {
    errors.push("You have to login!");
  }
  if (validationErrors.length == 0) {
    const query = `
    UPDATE
      affirmation
    SET
      date = ?,
      note = ?
    WHERE
      id = ?
    `;
    const values = [newDate, newNote, id];

    db.run(query, values, function (error) {
      if (error) {
        console.log(error);
        //display error
      } else {
        response.redirect("/affirmations/" + id);
      }
    });
  } else {
    const model = {
      affirmation: {
        id,
        date: newDate,
        note: newNote,
      },
      validationErrors,
    };
    response.render("update-affirmation.hbs", model);
  }
});

//delete affirmation/quotes

app.post("delete-affirmation/:id", function (request, response) {
  const id = request.params.id;
  const query = "DELETE FROM affirmation WHERE id =?";
  const values = [id];

  db.run(query, values, function (error) {
    if (error) {
      console.log(error);
      //display error
    } else {
      response.redirect("/affirmations");
    }
  });
});

app.listen(8080);
