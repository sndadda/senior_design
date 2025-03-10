import "./StudentEvaluation.css";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const StudentSurvey = ({ studentName }) => {
  const [responses, setResponses] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [showCompletedModal, setShowCompletedModal] = useState(false);

  const displayName = studentName || "the student";

  const handleChange = (question, value) => {
    setResponses((prev) => ({ ...prev, [question]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Check if all required questions have been answered
    const requiredQuestions = [
      "contribution",
      "facilitation",
      "completion",
      "constructive",
      "conflict",
      "student-comment",
    ];

    const allAnswered = requiredQuestions.every((question) => {
      return responses[question] !== undefined && responses[question] !== "";
    });

    if (!allAnswered) {
      // Show the modal if any required question is unanswered
      setShowModal(true);
    } else {
      // Show the "Survey Completed" modal if all questions are answered
      setShowCompletedModal(true);
    }
  };

  const navigate = useNavigate();

  const closeModal = () => {
    setShowModal(false);
  };

  const closeCompletedModal = () => {
    setShowCompletedModal(false);
    // Redirect to student dashboard after closing the completed modal
    navigate("/student-dashboard");
  };

  return (
    <div className="survey-form-container">
      <h1 className="survey-header">Course End Of Term Survey for {displayName}</h1>
      <p className="survey-description">Students enrolled in the course are required to complete the survey for all team members.</p>

      <form onSubmit={handleSubmit}>
        <div className="survey-question">
          <h3>1. Please rate how {displayName} contributes to Team Meetings.</h3>
          {["Does not contribute to Team Meetings.",
            "Shares ideas but does not advance the work of the group.",
            "Offers new suggestions to advance the work of the group.",
            "Offers alternate solutions or courses of actions that build on the ideas of others.",
            "Helps the team move forward by calculating the merits of alternative ideas or proposals."]
            .map((option, index) => (
              <label key={index} className="survey-label">
                <input type="radio" name="contribution" value={index} onChange={() => handleChange("contribution", index)} className="survey-input-radio" />
                {option} ({index})
              </label>
          ))}
        </div>

        <div className="survey-question">
          <h3>2. Please rate how {displayName} facilitates the Contributions of Team Members.</h3>
          {["Does not facilitate the Contributions of Team Members.",
            "Engages team members by taking turns and listening to others without interrupting.",
            "Engages team members by restating the views of others and asking for clarification.",
            "Engages team members by constructively building upon or synthesizing contributions.",
            "Engages team members by both building upon contributions and inviting others to engage."]
            .map((option, index) => (
              <label key={index} className="survey-label">
                <input type="radio" name="facilitation" value={index} onChange={() => handleChange("facilitation", index)} className="survey-input-radio" />
                {option} ({index})
              </label>
          ))}
        </div>

        <div className="survey-question">
          <h3>3. Please rate how {displayName} makes Individual Contributions Outside of Team Meetings.</h3>
          {["Does not complete all assigned tasks by deadline.",
            "Completes all assigned tasks by deadline.",
            "Completes tasks by deadline; work advances the project.",
            "Completes tasks by deadline; work is thorough and advances the project.",
            "Completes tasks by deadline; work is thorough, comprehensive, and helps others."]
            .map((option, index) => (
              <label key={index} className="survey-label">
                <input type="radio" name="completion" value={index} onChange={() => handleChange("completion", index)} className="survey-input-radio" />
                {option} ({index})
              </label>
          ))}
        </div>

        <div className="survey-question">
          <h3>4. Please rate how {displayName} fosters Constructive Team Climate.</h3>
          {["Does foster Constructive Team Climate.",
            "Treats team members respectfully by being polite and constructive in communication.",
            "Uses positive vocal or written tone, facial expressions, and/or body language to convey a positive attitude about the team and its work.",
            "Motivates teammates by expressing confidence about the importance of the task and the team's ability to accomplish it.",
            "Provides assistance and/or encouragement to team members."]
            .map((option, index) => (
              <label key={index} className="survey-label">
                <input type="radio" name="constructive" value={index} onChange={() => handleChange("constructive", index)} className="survey-input-radio" />
                {option} ({index})
              </label>
          ))}
        </div>

        <div className="survey-question">
          <h3>5. Please rate how {displayName} responds to Conflict.</h3>
          {["Does not respond to Conflict.",
            "Passively accepts alternate viewpoints/ideas/opinions.",
            "Redirecting focus toward common ground, toward task at hand (away from conflict).",
            "Identifies and acknowledges conflict and stays engaged with it.",
            "Addresses destructive conflict directly and constructively, helping to manage/resolve it in a way that strengthens overall team cohesiveness and future effectiveness."]
            .map((option, index) => (
              <label key={index} className="survey-label">
                <input type="radio" name="conflict" value={index} onChange={() => handleChange("conflict", index)} className="survey-input-radio" />
                {option} ({index})
              </label>
          ))}
        </div>

        <div className="survey-question">
          <h3>6. Please comment on {displayName}.</h3>
          <p>Please offer support for any claims you make, positive or negative, about this team member. Unsubstantiated claims will carry less weight.</p>
          <textarea
            name="student-comment"
            rows="5"
            placeholder="Enter your comments here..."
            onChange={(e) => handleChange("student-comment", e.target.value)}
            className="survey-textarea"
          ></textarea>
        </div>

        <div className="survey-button-group">
          <button type="button" onClick={() => navigate("/student-dashboard")} className="survey-cancel-button">
            Cancel
          </button>
          <button type="submit" className="survey-button">
            Submit
          </button>
        </div>
      </form>

      {/* Modal for unanswered questions */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Please answer all questions before submitting.</h3>
            <button onClick={closeModal} className="modal-close-button">Close</button>
          </div>
        </div>
      )}

      {/* Modal for completed survey */}
      {showCompletedModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Survey Completed!</h3>
            <button onClick={closeCompletedModal} className="modal-close-button">Close</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentSurvey
