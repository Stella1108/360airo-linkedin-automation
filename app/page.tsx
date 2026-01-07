  'use client'

  import { useEffect } from 'react'
  import { useRouter } from 'next/navigation'

  export default function Home() {
    const router = useRouter()

    useEffect(() => {
      // Directly redirect to accounts page without authentication
      router.push('/dashboard/')
    }, [router])
  }
  