import React, { createContext, useContext, useState } from 'react';

interface ModalContextType {
  showCreateUserModal: boolean;
  setShowCreateUserModal: (show: boolean) => void;
  showEditUserModal: boolean;
  setShowEditUserModal: (show: boolean) => void;
  showMessageModal: boolean;
  setShowMessageModal: (show: boolean) => void;
  selectedUserId: string | null;
  setSelectedUserId: (userId: string | null) => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export function ModalProvider({ children }: { children: React.ReactNode }) {
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  return (
    <ModalContext.Provider value={{
      showCreateUserModal,
      setShowCreateUserModal,
      showEditUserModal,
      setShowEditUserModal,
      showMessageModal,
      setShowMessageModal,
      selectedUserId,
      setSelectedUserId
    }}>
      {children}
    </ModalContext.Provider>
  );
}

export function useModal() {
  const context = useContext(ModalContext);
  if (context === undefined) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
} 
