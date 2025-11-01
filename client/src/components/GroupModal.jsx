import React, { useState } from 'react';

const GroupModal = ({ 
  isOpen, 
  onClose, 
  onCreateGroup, 
  onAddMember, 
  onRemoveMember, 
  onDeleteGroup,
  onHandleJoinRequest,
  availableUsers, 
  currentUserId,
  selectedGroup 
}) => {
  const [groupName, setGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [isCreating, setIsCreating] = useState(true);

  React.useEffect(() => {
    if (selectedGroup) {
      setIsCreating(false);
      setGroupName(selectedGroup.name);
    } else {
      setIsCreating(true);
      setGroupName('');
      setSelectedMembers([]);
    }
  }, [selectedGroup]);

  if (!isOpen) return null;

  const handleCreateGroup = () => {
    if (groupName.trim() && selectedMembers.length > 0) {
      onCreateGroup(groupName.trim(), selectedMembers);
      setGroupName('');
      setSelectedMembers([]);
      onClose();
    }
  };

  const handleAddMember = (userId) => {
    if (selectedGroup) {
      onAddMember(selectedGroup.id, userId);
    }
  };

  const handleRemoveMember = (userId) => {
    if (selectedGroup) {
      onRemoveMember(selectedGroup.id, userId);
    }
  };

  const handleDeleteGroup = () => {
    if (selectedGroup && window.confirm(`Are you sure you want to delete "${selectedGroup.name}"?`)) {
      onDeleteGroup(selectedGroup.id);
      onClose();
    }
  };

  const toggleMemberSelection = (userId) => {
    setSelectedMembers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const isAdmin = selectedGroup && selectedGroup.admin.userId === currentUserId;
  const currentMembers = selectedGroup ? selectedGroup.members : [];
  const currentMemberIds = currentMembers.map(m => m.userId);
  const availableToAdd = availableUsers.filter(user => 
    user.userId !== currentUserId && !currentMemberIds.includes(user.userId)
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
            {isCreating ? 'Create New Group' : selectedGroup?.name}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {isCreating ? (
            // Create Group Form
            <>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Group Name
                </label>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Enter group name..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                           bg-white dark:bg-gray-700 text-gray-800 dark:text-white
                           focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  maxLength={50}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select Initial Members (at least 1)
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                  Selected users will be automatically added to the group when it's created.
                </p>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {availableUsers.filter(user => user.userId !== currentUserId).map(user => (
                    <label
                      key={user.userId}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedMembers.includes(user.userId)}
                        onChange={() => toggleMemberSelection(user.userId)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className="text-gray-800 dark:text-white">{user.username}</span>
                    </label>
                  ))}
                  {availableUsers.length <= 1 && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                      No other users online
                    </p>
                  )}
                </div>
              </div>
            </>
          ) : (
            // Manage Group
            <>
              {/* Current Members */}
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Members ({currentMembers.length})
                </h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {currentMembers.map(member => (
                    <div
                      key={member.userId}
                      className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-700"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-gray-800 dark:text-white">{member.username}</span>
                        {member.isAdmin && (
                          <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 rounded-full font-medium">
                            Admin
                          </span>
                        )}
                      </div>
                      {isAdmin && !member.isAdmin && (
                        <button
                          onClick={() => handleRemoveMember(member.userId)}
                          className="text-red-500 hover:text-red-700 text-sm"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Join Requests (Admin Only) */}
              {isAdmin && selectedGroup?.joinRequests && selectedGroup.joinRequests.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Join Requests ({selectedGroup.joinRequests.length})
                  </h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {selectedGroup.joinRequests.map(request => (
                      <div
                        key={request.userId}
                        className="flex items-center justify-between p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-gray-800 dark:text-white">{request.username}</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(request.requestedAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => onHandleJoinRequest(selectedGroup.id, request.userId, 'approve')}
                            className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm font-medium"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => onHandleJoinRequest(selectedGroup.id, request.userId, 'reject')}
                            className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm font-medium"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add Members (Admin Only) */}
              {isAdmin && availableToAdd.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Add Members
                  </h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {availableToAdd.map(user => (
                      <div
                        key={user.userId}
                        className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-700"
                      >
                        <span className="text-gray-800 dark:text-white">{user.username}</span>
                        <button
                          onClick={() => handleAddMember(user.userId)}
                          className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                        >
                          Add
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          {isCreating ? (
            <button
              onClick={handleCreateGroup}
              disabled={!groupName.trim() || selectedMembers.length === 0}
              className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 
                       disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
            >
              Create Group
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white 
                         rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Close
              </button>
              {isAdmin && (
                <button
                  onClick={handleDeleteGroup}
                  className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  Delete Group
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GroupModal;
