let ctrlDown = false;
let qNo = 0;
let ctrlKey = 17,
  cmdKey = 91,
  vKey = 86,
  cKey = 67;

let languageIDs = [
  { id: 50, name: "C (GCC 9.2.0)" },
  { id: 54, name: "C++ (GCC 9.2.0)" },
  { id: 51, name: "C# (Mono 6.6.0.161)" },
  { id: 60, name: "Go (1.13.5)" },
  { id: 62, name: "Java (OpenJDK 13.0.1)" },
  { id: 63, name: "JavaScript (Node.js 12.14.0)" },
  { id: 71, name: "Python (3.8.1)" },
];

let timerCont = document.getElementById("timer");
let s = 0;
let m = 0;
let timerId;
const _totalNumQues = 5;
let codeMap = new Map();

$(document).ready(function () {
  for (var i = 0; i < _totalNumQues; i++) {
    codeMap.set(i, null);
  }

  sendRequest("GET", "/getChancesUsed/", null)
    .then(function (response) {
      response = JSON.parse(response);
      var clicks = response["chancesUsed"];
      document.getElementById("view-chances").innerText = 5 - clicks;
    })
    .catch();

  populateLangs();
  getQuestion(0);
  disableCopyPaste();
  leaderbInit();
  increaseTime();
  hideCode();
  addResizeEvent();
  tabOrWindowChange();
  showBtnInit();
});

function showBtnInit() {
  document.getElementById("showCode").addEventListener("click", () => {
    showCode();
  });
}

function addResizeEvent() {
  window.onresize = function () {
    if (window.outerHeight - window.innerHeight > 100) {
      logout("screen-resize");
    }
  };
}

function tabOrWindowChange() {
  document.addEventListener("visibilitychange", (event) => {
    if (document.visibilityState == "visible") {
    } else {
      logout("Focus Lost");
    }
  });
}

function leaderbInit() {
  let i = 0;
  $(".leaderboard-icon").click(function () {
    $(".leaderboard").fadeToggle(650, "swing");
    if (i === 0) {
      $(".li").html("cancel");
      i = 1;
      // getLeaderboard();
      // insert_chart
    } else {
      $(".li").html("insert_chart");
      i = 0;
    }
  });
}

function disableCopyPaste() {
  var inp = document.getElementsByClassName("noselect")[0];
  inp.addEventListener(
    "select",
    function () {
      this.selectionStart = this.selectionEnd;
    },
    false
  );
  document.addEventListener("contextmenu", (event) => event.preventDefault());
  $(document)
    .keydown(function (e) {
      if (e.keyCode == ctrlKey || e.keyCode == cmdKey) ctrlDown = true;
    })
    .keyup(function (e) {
      if (e.keyCode == ctrlKey || e.keyCode == cmdKey) ctrlDown = false;
    });

  $(".no-copy-paste").keydown(function (e) {
    if (ctrlDown && e.keyCode == cKey) {
      console.log("Document catch Ctrl+C");
    }
    if (ctrlDown && e.keyCode == vKey) {
      console.log("Document catch Ctrl+V");
    }
    if (ctrlDown && (e.keyCode == vKey || e.keyCode == cKey)) {
      return false;
    }
  });
}

function populateLangs() {
  console.log("Populating Languages");

  let selectField = document.getElementById("langSelect");
  for (element of languageIDs) {
    var opt = document.createElement("option");
    opt.value = element["id"] + ";";
    opt.innerHTML = element["name"];
    selectField.appendChild(opt);
  }
}

function logout(reason) {
  if (reason == "Finished") {
    Swal.fire(
      "Congratulations",
      "You have successfully attempted all the questions",
      "success"
    );
  } else if (reason == "screen-resize") {
    Swal.fire(
      "Sorry",
      "You will be logged out since you didn't follow the instructions",
      "error"
    );
  } else if (reason == "TimeUp") {
    Swal.fire(
      "Time Up!",
      "Sorry, time is up. You won't be able to answer questions any further.",
      "success"
    );
  } else if (reason == "no-account") {
    Swal.fire(
      "Oops",
      "Seems you have not logged in. Please login to access the game.",
      "error"
    );
  }

  setTimeout(function goOut() {
    window.location.href = "/";
  }, 2000);
}

function resetTime() {
  s = 0;
  m = 0;
}

function setOutput(outp) {
  document.getElementById("compilerOutput").value = outp;
}

function setScore(score) {
  document.getElementById("score").innerHTML = score;
}

function setRunAttempts(attempts) {
  document.getElementById("run-attempts").innerHTML = attempts;
}

function getOutput() {
  return document.getElementById("compilerOutput").value;
}

function increaseQNum() {
  qNo = (getQNum() + 1) % _totalNumQues;
}

function getQNum() {
  return qNo;
}

function getCode() {
  return document.getElementById("codeInput").value;
}

function getLanguage() {
  return document.getElementById("langSelect").value;
}

function disableRun() {
  document.getElementById("runBtn").disabled = true;
}

function enableRun() {
  document.getElementById("runBtn").disabled = false;
}

function runCode() {
  disableRun();
  pauseTime();

  console.log(`Time elapsed is: ${m} minutes and ${s} seconds`);

  let prog = getCode();
  let lang = getLanguage();

  let langInfo = lang.split(";");
  let langID = langInfo[0];

  let time = m * 60 + s;
  let loginEmail = document.getElementById("email").value;

  let program = {
    source_code: btoa(prog),
    language_id: langID,
    qNo: getQNum(),
    timeElapsed: time,
    email: loginEmail,
  };

  console.log(prog);
  document.getElementById("compilerOutput").innerText = "Running...";

  if (langID == "")
    Swal.fire(
      "Could Not Run Code",
      "Seems you have not selected a language. Please select a language to continue.",
      "error"
    );
  else
    sendRequest("POST", "/runCode/", program)
      .then(function (response) {
        window.alert(response)

        response = JSON.parse(response);
        setOutput(atob(response["stdout"]));
        if(response["stderr"] != "")
          //setOutput(atob(response["stderr"]));
          setOutput("Your code failed to run on one or multiple test cases. Please try again.")  
        setScore(response["score"]);
        setRunAttempts(response["runAttempts"]);

        if (getOutput() == "Correct Answer") {
          if (response["completedGame"] == "true") {
            Swal.fire(
              "Congrats!",
              "You have correctly answered all questions!",
              "success"
            );
            logout("Finished");
          }
          resetTime();
          increaseQNum();
          getQuestion(qNo);
        }

        increaseTime();
        enableRun();
      })
      .catch(function (error) {
        increaseTime();
        enableRun();

        console.error(error);
      });
}

function getCookie(name) {
  var v = document.cookie.match("(^|;) ?" + name + "=([^;]*)(;|$)");
  return v ? v[2] : null;
}

function sendRequest(type, url, data) {
  let request = new XMLHttpRequest();
  let csrftoken = getCookie("csrftoken");

  return new Promise(function (resolve, reject) {
    request.onreadystatechange = () => {
      if (request.readyState !== 4) return;
      // Process the response
      if (request.status >= 200 && request.status < 300) {
        // If successful
        resolve(request.responseText);
      } else {
        // If failed
        reject({
          status: request.status,
          statusText: request.statusText,
        });
      }
    };

    // Setup our HTTP request
    request.open(type || "GET", url, true);
    // Add csrf token
    request.setRequestHeader("X-CSRFToken", csrftoken);
    // Send the request
    request.send(JSON.stringify(data));
  });
}

function getQuestion(queNum) {
  codeMap.set(qNo, getCode());

  sendRequest("POST", "/question/", { queNum })
    .then(function (response) {
      response = JSON.parse(response);
      let inpt = response["sampIn"].split(" ");
      let inStr = "";
      for (let i = 0; i < inpt.length; i++) {
        inStr += inpt[i];
        inStr += "\n";
      }
      let que =
        response["question"] +
        "<br><br><strong>Sample Input</strong><br>" +
        inStr +
        "<br><br><strong>Test Cases</strong><br> " +
        response["sampTCNum"] +
        "<br><br><strong>Sample Output</strong><br>" +
        response["sampleOut"];
      document.getElementsByClassName("qno")[0].innerHTML =
        "Q. " + (queNum + 1);
      document.getElementsByClassName("left")[0].innerHTML = que;
      qNo = response["qNo"];
      document.getElementById("score").innerHTML = response["userScore"];
      var s = document.getElementById("codeInput");
      s.value = codeMap.get(queNum);

      const input = document.querySelector("#menuToggle input");
      input.checked = false;
    })
    .catch(function (error) {
      increaseTime();
      console.error(error);
    });
}

function login() {
  sendRequest("POST", "login/", "")
    .then(function (resp) {
      console.log(resp);
    })
    .catch(function (error) {
      console.error(error);
    });
}

function showInstructions() {
  document.getElementsByClassName("instructions")[0].style.display = "flex";
  document.getElementsByClassName("backdrop")[0].style.display = "block";
}

function closeInstructions() {
  document.getElementsByClassName("instructions")[0].style.display = "none";
  document.getElementsByClassName("backdrop")[0].style.display = "none";
}

document.addEventListener("DOMContentLoaded", function () {
  var elems = document.querySelectorAll("select");
});

$(document).delegate("#codeInput", "keydown", function (e) {
  var keyCode = e.keyCode || e.which;

  if (keyCode == 9) {
    e.preventDefault();
    var start = this.selectionStart;
    var end = this.selectionEnd;

    // set textarea value to: text before caret + tab + text after caret
    $(this).val(
      $(this).val().substring(0, start) + "\t" + $(this).val().substring(end)
    );

    // put caret at right position again
    this.selectionStart = this.selectionEnd = start + 1;
  }
});

function increaseTime() {
  const INITIAL_TIME = 1.5 * 60 * 60 * 1000;
  var timeElapsed = 0;

  timerId = setInterval(function () {
    timeElapsed += 1000;
    var timeleft = INITIAL_TIME - timeElapsed;

    var hours = Math.floor(
      (timeleft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    );
    var minutes = Math.floor((timeleft % (1000 * 60 * 60)) / (1000 * 60));
    var seconds = Math.floor((timeleft % (1000 * 60)) / 1000);

    hours = Math.max(0, hours);
    minutes = Math.max(0, minutes);
    seconds = Math.max(0, seconds);

    if (hours < 10) {
      hours = "0" + hours;
    }

    if (minutes < 10) {
      minutes = "0" + minutes;
    }

    if (seconds < 10) {
      seconds = "0" + seconds;
    }

    timerCont.innerHTML = hours + ":" + minutes + ":" + seconds;

    if (hours == "00" && minutes == "00" && seconds == "00") logout("TimeUp");
  }, 1000);
}

// Pause time function
function pauseTime() {
  clearInterval(timerId);
}

// Won't allow user to cheat by changing text-color
let codeIntervalId;
let clicks = 0;

const hideCode = () => {
  document.getElementById("codeInput").style.color = "black";
};

function increaseClicks(clicks) {
  pauseTime();
  let data = {
    clicks: clicks + 1,
  };

  sendRequest("POST", "/increaseClicks/", data)
    .then(function (response) {
      increaseTime();
    })
    .catch(function (error) {
      increaseTime();
      console.error(error);
    });
}

const showCode = () => {
  pauseTime();

  sendRequest("GET", "/getChancesUsed/", null)
    .then(function (response) {
      response = JSON.parse(response);
      var clicks = response["chancesUsed"];
      document.getElementById("view-chances").innerText = Math.max(
        0,
        4 - clicks
      );

      console.log(clicks);
      const box = document.getElementById("codeInput");
      if (box.disabled === false) {
        // Functionality won't be achieved after two clicks
        if (clicks >= 5) {
          Swal.fire(
            "Sorry..",
            "You have used up all your view code chances!",
            "error"
          );
          return;
        } else {
          // Disable button and show code for 5 seconds
          document.getElementById("showCode").disabled = true;
          box.disabled = true;
          // clearInterval(codeIntervalId);
          box.style.color = "white";
          setTimeout(() => {
            hideCode();
            box.disabled = false;
            document.getElementById("showCode").disabled = false;
          }, 5000);
        }

        increaseClicks(clicks);
      }
    })
    .catch(function (error) {
      console.log("Error of show code");
      increaseTime();
      console.error(error);
    });
};

$(document).ready(function () {
  $("select").formSelect();
});
