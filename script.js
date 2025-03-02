document.addEventListener("DOMContentLoaded", function () {
    const emailInput = document.querySelector("#email, #signup-email");
    const passwordInput = document.querySelector("#password, #signup-password");
    const submitButton = document.querySelector("button");
    const passwordToggles = document.querySelectorAll(".password-toggle");

    // Function to validate email format
    function isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    // Function to check form validity
    function validateForm() {
        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();

        if (isValidEmail(email) && password.length >= 6) {
            submitButton.disabled = false;
        } else {
            submitButton.disabled = true;
        }
    }

    // Event Listeners for real-time validation
    emailInput.addEventListener("input", validateForm);
    passwordInput.addEventListener("input", validateForm);

    // Password toggle feature
    passwordToggles.forEach(toggle => {
        toggle.addEventListener("click", function () {
            let input = this.previousElementSibling;
            if (input.type === "password") {
                input.type = "text";
                this.innerHTML = "🔒";
            } else {
                input.type = "password";
                this.innerHTML = "👁";
            }
        });
    });

    // Initially disable the button
    submitButton.disabled = true;
});

const form = document.querySelector("form");
if (form) {
  form.addEventListener("submit", function (event) {
    event.preventDefault();

    if (window.location.pathname.endsWith("signup.html")) {
      handleSignup(event);
    } 
    else {
      handleLogin(event);
    }
  });
}

if (window.location.pathname === "/" || 
    window.location.pathname.endsWith("student_dashboard.html") || 
    window.location.pathname.endsWith("professor_dashboard.html")) {
      checkAuthStatus();
}

async function checkAuthStatus() {
  try {
    const response = await fetch("/user");
    if (!response.ok) {
      if (response.status === 404) {
        // If not logged in, redirect
        if (!window.location.pathname.endsWith("index.html")) {
          window.location.href = "index.html";
        }
        return;
      }
      throw new Error(`Error: ${response.status} - ${response.statusText}`);
    }

  } 
  catch (error) {
    console.error("Error checking auth status:", error);
    if (!window.location.pathname.endsWith("index.html")) {
      window.location.href = "index.html";
    }
  }
}

async function handleLogin(event) {
  event.preventDefault();
    
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  const errorMessage = document.getElementById("login-error-message");
  
  try {
    // Send request to login route from server
    const response = await fetch("/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
  
    if (!response.ok) {
      throw new Error(data.message || "Login failed.");
    }
  
    // Check the user role is either a student or professor and redirect them
    if (data.user.account_type === 'student') {
      window.location.href = "/student_dashboard.html";
    } 
    else if (data.user.account_type === 'professor') {
      window.location.href = "/professor_dashboard.html";
    } 
  } 
  catch (error) {
    if (errorMessage) {
      errorMessage.textContent = error.message;
      errorMessage.style.display = "block";
    } 
    else {
      console.error(error);
    }
  }
}
  
  
async function handleSignup(event) {
  event.preventDefault();
  
  const email = document.getElementById("signup-email").value.trim();
  const password = document.getElementById("signup-password").value.trim();  
  const errorMessage = document.getElementById("signup-error-message");
  
  try {
    // Send request to signup route from server
    const response = await fetch("/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
  
    if (!response.ok) {
      throw new Error(data.message || "Sign-up failed.");
    }
  
    alert("Sign-up successful! Please log in.");
    window.location.href = "index.html";
  
  } 
  catch (error) {
    if (errorMessage) {
      errorMessage.textContent = error.message;
      errorMessage.style.display = "block";
    } 
    else {
      console.error(error);
    }
  }
}
  