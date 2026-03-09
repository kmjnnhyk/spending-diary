import UploadFlow from '@/components/UploadFlow'

export default function UploadPage() {
  const now = new Date()

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <UploadFlow year={now.getFullYear()} month={now.getMonth() + 1} />
    </div>
  )
}
