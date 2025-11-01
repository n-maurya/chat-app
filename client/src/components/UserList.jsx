import React from 'react';

const UserList = ({ users, currentUserId, onSelectUser, selectedUserId, darkMode, allKnownUsers = [], unreadCounts = {} }) => {
  const onlineUsers = users.filter(user => user.userId !== currentUserId);
  const onlineUserIds = new Set(onlineUsers.map(u => u.userId));
  
  // Combine online users with known offline users from chat history
  const offlineUsers = allKnownUsers.filter(user => 
    user.userId !== currentUserId && !onlineUserIds.has(user.userId)
  );
  
  const allUsers = [...onlineUsers, ...offlineUsers];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className={`p-4 ${darkMode ? 'border-gray-700' : 'border-gray-200'} border-b`}>
        <h2 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'} mb-1`}>
          Messages
        </h2>
        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          {onlineUsers.length} online • {offlineUsers.length} offline
        </p>
      </div>

      {/* User List */}
      <div className="flex-1 overflow-y-auto">
        {allUsers.length === 0 ? (
          <div className="p-8 text-center">
            <div className={`text-4xl mb-2 ${darkMode ? 'text-gray-700' : 'text-gray-300'}`}>👥</div>
            <p className={`text-sm ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
              No other users online
            </p>
            <p className={`text-xs mt-2 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>
              Waiting for others to join...
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-700">
            {allUsers.map((user) => {
              const isOnline = onlineUserIds.has(user.userId);
              const unreadCount = unreadCounts[user.userId] || 0;
              
              return (
                <button
                  key={user.userId}
                  onClick={() => onSelectUser(user)}
                  className={`w-full p-4 flex items-center gap-3 transition-colors relative ${
                    selectedUserId === user.userId
                      ? darkMode
                        ? 'bg-green-900 bg-opacity-30'
                        : 'bg-green-50'
                      : darkMode
                      ? 'hover:bg-gray-700'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  {/* Avatar */}
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 relative ${
                    selectedUserId === user.userId
                      ? 'bg-gradient-to-br from-green-400 to-blue-500'
                      : 'bg-gradient-to-br from-purple-400 to-pink-500'
                  }`}>
                    <span className="text-white font-bold text-lg">
                      {user.username.charAt(0).toUpperCase()}
                    </span>
                    {/* Online/Offline indicator */}
                    <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 ${
                      darkMode ? 'border-gray-800' : 'border-white'
                    } ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                  </div>

                  {/* User Info */}
                  <div className="flex-1 text-left">
                    <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {user.username}
                    </h3>
                    <div className="flex items-center gap-1 mt-1">
                      <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                      <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {isOnline ? 'Online' : 'Offline'}
                      </span>
                    </div>
                  </div>
                  
                  {/* Unread badge */}
                  {unreadCount > 0 && selectedUserId !== user.userId && (
                    <div className="absolute top-2 right-2 bg-green-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5 shadow-lg">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </div>
                  )}

                  {/* Selected Indicator */}
                  {selectedUserId === user.userId && (
                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserList;
