import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { RiUser3Line, RiTimeLine } from "react-icons/ri";

// Displays user information and current time in the sidebar
const UserInfo = ({ username, currentDateTime }) => {
  // Local state to manage datetime updates
  const [localDateTime, setLocalDateTime] = useState(currentDateTime);

  // Update local time when parent time changes
  useEffect(() => {
    setLocalDateTime(currentDateTime);
  }, [currentDateTime]);

  return (
    <div className="user-info">
      {/* Username display with icon */}
      <div className="user-detail">
        <RiUser3Line />
        <span>{username}</span>
      </div>
      {/* Current date/time display with icon */}
      <div className="datetime-detail">
        <RiTimeLine />
        <span className="datetime">{localDateTime}</span>
      </div>
    </div>
  );
};

// Prop validation
UserInfo.propTypes = {
  username: PropTypes.string.isRequired,
  currentDateTime: PropTypes.string.isRequired,
};

export default UserInfo;