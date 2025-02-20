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
