import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/** 路由切换时将页面滚动到顶部 */
export default function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0
  }, [pathname])

  return null
}
