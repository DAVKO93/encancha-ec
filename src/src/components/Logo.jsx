export default function Logo({ className = 'h-10 w-auto', white = false, alt = 'Encancha.ec' }) {
  return <img src={white ? '/logo-white.png' : '/logo.png'} alt={alt} className={className} draggable="false" />
}
