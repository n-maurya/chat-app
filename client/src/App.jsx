import React, { useState, useEffect } from 'react';
import RegisterPage from './pages/RegisterPage';
import LandingPage from './pages/LandingPage';
import ChatPage from './pages/ChatPage';
import './App.css';

function App() {
  const [currentPage, setCurrentPage] = useState('register');
  const [userData, setUserData] = useState(null);

  // Check if user is already registered
  useEffect(() => {
    const savedUser = localStorage.getItem('smartchat_user');
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        setUserData(user);
        setCurrentPage('landing');
      } catch (error) {
        console.error('Error loading user data:', error);
        localStorage.removeItem('smartchat_user');
      }
    }
  }, []);

  const handleRegister = (user) => {
    setUserData(user);
    setCurrentPage('landing');
  };

  const handleStartChat = () => {
    setCurrentPage('chat');
  };

  const handleBackToHome = () => {
    setCurrentPage('landing');
  };

  return (
    <div className="App">
      {currentPage === 'register' && (
        <RegisterPage onRegister={handleRegister} />
      )}
      {currentPage === 'landing' && userData && (
        <LandingPage onStartChat={handleStartChat} userData={userData} />
      )}
      {currentPage === 'chat' && userData && (
        <ChatPage onBack={handleBackToHome} userData={userData} />
      )}
    </div>
  );
}

export default App;
