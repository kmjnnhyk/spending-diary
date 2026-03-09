import ImageUploader from '@/components/ImageUploader'

export default function UploadPage() {
  const now = new Date()

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">{'\ub0b4\uc5ed \uc774\ubbf8\uc9c0 \uc5c5\ub85c\ub4dc'}</h1>
      <ImageUploader year={now.getFullYear()} month={now.getMonth() + 1} />
    </div>
  )
}
