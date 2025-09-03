import React from "react";
import EditForm from '@/components/ui/editor-form'

type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string
};

export default function Modal({ isOpen, onClose,imageUrl }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-lg shadow-lg p-6 min-w-[300px] max-w-[90vw] relative">
         <button
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-800"
          onClick={onClose}
        >
          &times;
        </button>
        <div className="flex">
          <div className="flex-1">
            <EditForm />
          </div>
          <div className="flex-1">
            <img src={imageUrl} alt="Modal Image" className="mb-4 max-w-full rounded" />
          </div>
        </div>
   
       

        
        </div>
    </div>
  );
}