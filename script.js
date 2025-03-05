document.addEventListener("DOMContentLoaded", function () {
    const page = document.body.getAttribute("data-page");

    if (page === "login" || page === "signup" || page === "professorsignup") {
        setupAuthForm();
    } else if (page === "evaluation") {
        setupEvaluationPage();
    } else if (page === "survey") {
        setupSurveyPage();
    }
});

// 📌 AUTH FORM LOGIC (Login & Signup)
function setupAuthForm() {
    const emailInput = document.querySelector("#email") || document.querySelector("#signup-email") || document.querySelector("#professor-email");
    const passwordInput = document.querySelector("#password") || document.querySelector("#signup-password") || document.querySelector("#professor-password");
    const departmentInput = document.querySelector("#department");
    const titleInput = document.querySelector("#title");
    const submitButton = document.querySelector("button[type='submit']");
    const passwordToggles = document.querySelectorAll(".password-toggle");

    // Function to validate email format
    function isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    // Function to check form validity
    function validateForm() {
        const email = emailInput?.value.trim();
        const password = passwordInput?.value.trim();
        const department = departmentInput?.value.trim();
        const title = titleInput?.value;

        // Check if it's the professor signup page
        const isProfessorSignup = document.body.getAttribute("data-page") === "professorsignup";

        if (isValidEmail(email) && password.length >= 6) {
            if (isProfessorSignup) {
                submitButton.disabled = !(department && title); // Require department & title
            } else {
                submitButton.disabled = false;
            }
        } else {
            submitButton.disabled = true;
        }
    }

    // Event Listeners for real-time validation
    if (emailInput && passwordInput) {
        emailInput.addEventListener("input", validateForm);
        passwordInput.addEventListener("input", validateForm);
    }

    if (departmentInput && titleInput) {
        departmentInput.addEventListener("input", validateForm);
        titleInput.addEventListener("change", validateForm);
    }

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
    if (submitButton) {
        submitButton.disabled = true;
    }

    // Redirect logic for Login & Signup
    const authForm = document.querySelector("form");
    if (authForm) {
        authForm.addEventListener("submit", function (event) {
            event.preventDefault();
            if (document.body.getAttribute("data-page") === "signup") {
                window.location.href = "index.html"; // Redirect to login after signup
            } else if (document.body.getAttribute("data-page") === "professorsignup") {
                window.location.href = "index.html"; // Redirect to login after professor signup
            }
        });
    }
}

// 📌 PEER EVALUATION LOGIC
function setupEvaluationPage() {
    const courseSelect = document.getElementById("course");
    const teammateSelect = document.getElementById("teammate");
    const nextButton = document.getElementById("next-btn");

    if (!courseSelect || !teammateSelect || !nextButton) return;

    function validateSelection() {
        nextButton.disabled = !(courseSelect.value && teammateSelect.value);
    }

    // Enable "Next" button when both fields have a value
    courseSelect.addEventListener("change", validateSelection);
    teammateSelect.addEventListener("change", validateSelection);

    // Handle form submission
    document.getElementById("evaluation-form").addEventListener("submit", function (event) {
        event.preventDefault();
        window.location.href = `survey.html?course=${encodeURIComponent(courseSelect.value)}&teammate=${encodeURIComponent(teammateSelect.value)}`;
    });

    // Ensure button is disabled initially
    validateSelection();
}

// 📌 SURVEY FORM LOGIC
function setupSurveyPage() {
    const urlParams = new URLSearchParams(window.location.search);
    const courseName = urlParams.get("course") || "Unknown Course";
    const teammateName = urlParams.get("teammate") || "Unknown Teammate";

    // Display dynamic course and teammate names
    const evaluatingText = document.getElementById("evaluating-text");
    if (evaluatingText) {
        evaluatingText.innerHTML = `<strong>${courseName} – ${teammateName}</strong>`;
    }

    const submitButton = document.getElementById("submit-eval-btn");
    const backButton = document.getElementById("back-btn");

    // Ensure submission only happens when all questions are answered
    function validateSurvey() {
        const allRadioGroups = document.querySelectorAll(".question");
        let allAnswered = true;

        allRadioGroups.forEach(group => {
            const selectedOption = group.querySelector("input[type='radio']:checked");
            if (!selectedOption) {
                allAnswered = false;
            }
        });

        submitButton.disabled = !allAnswered;
    }

    // Add event listeners to all radio buttons
    document.querySelectorAll("input[type='radio']").forEach(radio => {
        radio.addEventListener("change", validateSurvey);
    });

    // Handle form submission
    document.getElementById("survey-form").addEventListener("submit", function (event) {
        event.preventDefault();
        alert("Peer evaluation submitted successfully! ✅");
        window.location.href = "evaluation.html"; // Redirect back to evaluation page
    });

    // Handle back button
    backButton.addEventListener("click", function () {
        window.history.back();
    });

    // Ensure button is disabled initially
    submitButton.disabled = true;
}
