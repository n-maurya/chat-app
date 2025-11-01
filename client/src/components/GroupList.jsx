import React from 'react';

const GroupList = ({ groups, currentUserId, selectedGroupId, onSelectGroup, onCreateGroup, onJoinGroup, groupUnreadCounts = {}, darkMode = false }) => {
  // Filter groups where current user is a member
  const userGroups = groups.filter(group => 
    group.members.some(member => member.userId === currentUserId)
  );

  // Filter groups where current user is NOT a member (available to join)
  const availableGroups = groups.filter(group => 
    !group.members.some(member => member.userId === currentUserId)
  );

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center mb-2">
          <h2 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
            Groups
          </h2>
          <button
            onClick={onCreateGroup}
            className="px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
          >
            + New
          </button>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {userGroups.length} {userGroups.length === 1 ? 'group' : 'groups'}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {userGroups.length === 0 ? (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400">
            <p className="text-sm">No groups yet</p>
            <p className="text-xs mt-1">Create a group to get started</p>
          </div>
        ) : (
          <div className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
            {userGroups.map((group) => {
              const isAdmin = group.admin.userId === currentUserId;
              const isSelected = group.id === selectedGroupId;
              const unreadCount = groupUnreadCounts[group.id] || 0;

              return (
                <div
                  key={group.id}
                  onClick={() => onSelectGroup(group)}
                  className={`
                    p-3 cursor-pointer transition-all relative
                    ${isSelected 
                      ? 'bg-blue-500 text-white shadow-md rounded-lg' 
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200'
                    }
                  `}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold truncate ${
                          isSelected 
                            ? 'text-white' 
                            : darkMode 
                              ? 'text-white' 
                              : 'text-gray-800'
                        }`}>
                          {group.name}
                        </span>
                        {isAdmin && (
                          <span className={`
                            text-xs px-2 py-0.5 rounded-full font-medium
                            ${isSelected 
                              ? 'bg-blue-600 text-white' 
                              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                            }
                          `}>
                            Admin
                          </span>
                        )}
                        {/* Unread badge */}
                        {unreadCount > 0 && !isSelected && (
                          <span className="bg-green-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5 shadow-lg ml-auto">
                            {unreadCount > 99 ? '99+' : unreadCount}
                          </span>
                        )}
                      </div>
                      <p className={`
                        text-xs mt-1
                        ${isSelected 
                          ? 'text-blue-100' 
                          : 'text-gray-500 dark:text-gray-400'
                        }
                      `}>
                        {group.members.length} {group.members.length === 1 ? 'member' : 'members'}
                      </p>
                    </div>
                    
                    <div className={`
                      w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0
                      ${isSelected 
                        ? 'bg-blue-600' 
                        : 'bg-gray-300 dark:bg-gray-600'
                      }
                    `}>
                      <svg 
                        className={`w-5 h-5 ${isSelected ? 'text-white' : 'text-gray-600 dark:text-gray-300'}`}
                        fill="currentColor" 
                        viewBox="0 0 20 20"
                      >
                        <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                      </svg>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Available Groups to Join */}
        {availableGroups.length > 0 && (
          <div className="mt-4">
            <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700">
              <h3 className={`text-sm font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Available Groups
              </h3>
            </div>
            <div className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
              {availableGroups.map((group) => (
                <div
                  key={group.id}
                  className="p-3 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all first:rounded-t-lg last:rounded-b-lg"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`font-medium truncate ${
                          darkMode ? 'text-white' : 'text-gray-800'
                        }`}>
                          {group.name}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {group.members.length} {group.members.length === 1 ? 'member' : 'members'}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onJoinGroup(group.id);
                      }}
                      className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 transition-colors text-sm font-medium"
                    >
                      Join
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GroupList;
