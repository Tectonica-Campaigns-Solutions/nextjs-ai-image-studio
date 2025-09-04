import {useState} from 'react'
import {Button} from '@/components/ui/button'
import {Send, Loader2} from 'lucide-react'

type ModalProps = {
	isOpen: boolean
	onClose: () => void
	imageUrl: string
}

export default function Modal({isOpen, onClose, imageUrl}: ModalProps) {
	if (!isOpen) return null
	const [isLoading, setIsLoading] = useState(false)
	const handleSubmit = async (imageUrl) => {
		try {
			const imageResponse = await fetch(imageUrl)
			const blob = await imageResponse.blob()

			// Step 3: Wrap Blob into a File (like in the browser)
			// @ts-ignore
			const file = new File([blob], 'image.png', {type: blob.type})
			const formData = new FormData()
			formData.append('image', file)
			formData.append('prompt', 'change man for woman')
			formData.append('useRag', 'true')
			const response = await fetch(
				`${process.env.NEXT_PUBLIC_BASE_URL}/api/edit-image`,
				{
					method: 'POST',
					body: formData,
				}
			)
      const responseValues = await response.json();
      console.log(responseValues.image)
		} catch (error) {
			console.log(error)
		}
	}
	return (
		<div className='fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40'>
			<div className='bg-white rounded-lg shadow-lg p-6 min-w-[300px] max-w-[90vw] relative'>
				<button
					className='absolute top-2 right-2 text-gray-500 hover:text-gray-800'
					onClick={onClose}
				>
					&times;
				</button>
				<div className='block'>
					<div className='flex'>
						<label className='block'>Prompt</label>
						<textarea className='block flex-1 min-h-[60px] max-h-[150px] resize-none' />
						<Button
							onClick={() => handleSubmit(imageUrl)}
							disabled={isLoading}
							className='self-end'
						>
							{isLoading ? (
								<Loader2 className='h-4 w-4 animate-spin' />
							) : (
								<Send className='h-4 w-4' />
							)}
						</Button>
					</div>
				</div>
				<div className='flex'>
					<div className='flex-1'>
						<img
							src={imageUrl}
							alt='Modal Image'
							className='mb-4 max-w-full rounded'
						/>
					</div>
					<div className='flex-1'>New image</div>
				</div>
			</div>
		</div>
	)
}
