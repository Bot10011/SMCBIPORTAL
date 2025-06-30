import React, { createContext, useContext, useState } from 'react';

interface ModalContextType {
  showCreateUserModal: boolean;
  setShowCreateUserModal: (show: boolean) => void;
  showEditUserModal: boolean;
  setShowEditUserModal: (show: boolean) => void;
  showMessageModal: boolean;
  setShowMessageModal: (show: boolean) => void;
  showUserLocationModal: boolean;
  setShowUserLocationModal: (show: boolean) => void;
  selectedUserId: string | null;
  setSelectedUserId: (userId: string | null) => void;
  isModalOpen: boolean;
  closeModal: () => void;
  openModal: (type: string) => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export function ModalProvider({ children }: { children: React.ReactNode }) {
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [showUserLocationModal, setShowUserLocationModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const closeModal = () => {
    setIsModalOpen(false);
    setShowCreateUserModal(false);
    setShowEditUserModal(false);
    setShowMessageModal(false);
    setShowUserLocationModal(false);
  };

  const openModal = (type: string) => {
    setIsModalOpen(true);
    switch (type) {
      case 'create':
        setShowCreateUserModal(true);
        break;
      case 'edit':
        setShowEditUserModal(true);
        break;
      case 'message':
        setShowMessageModal(true);
        break;
      case 'userLocation':
        setShowUserLocationModal(true);
        break;
    }
  };

  return (
    <ModalContext.Provider value={{
      showCreateUserModal,
      setShowCreateUserModal,
      showEditUserModal,
      setShowEditUserModal,
      showMessageModal,
      setShowMessageModal,
      showUserLocationModal,
      setShowUserLocationModal,
      selectedUserId,
      setSelectedUserId,
      isModalOpen,
      closeModal,
      openModal
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
