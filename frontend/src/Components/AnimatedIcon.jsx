import logo from '../assets/ChatGenie-logo.png';

// Animated icon component that displays the ChatGenie logo with 3D animation
const AnimatedIcon = () => (
  <div className="animated-icon-wrapper">
    <div className="animated-icon-3d">
      <img 
        src={logo} 
        alt="ChatGenie Logo" 
        className="logo-image"
      />
      <div className="glow-effect"></div>
    </div>
  </div>
);

export default AnimatedIcon;
