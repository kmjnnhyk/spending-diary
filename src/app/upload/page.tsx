import UploadFlow from '@/components/UploadFlow'

export default function UploadPage() {
  const now = new Date()

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">{'내역 이미지 업로드'}</h1>
      <UploadFlow year={now.getFullYear()} month={now.getMonth() + 1} />
    </div>
  )
}
