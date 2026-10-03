import { Header } from "@/components/sections/header"
import { Hero } from "@/components/sections/hero"
import { About } from "@/components/sections/about"
import { Words } from "@/components/sections/words"
import { DailyReadings } from "@/components/sections/daily-readings"
import { GospelChat } from "@/components/sections/gospel-chat"
import { Schedule } from "@/components/sections/schedule"
import { Sacraments } from "@/components/sections/sacraments"
import { News } from "@/components/sections/news"
import { Contacts } from "@/components/sections/contacts"
import { Footer } from "@/components/sections/footer"
import { MobileCallButton } from "@/components/sections/mobile-call-button"

function App() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <About />
        <Words />
        <DailyReadings />
        <GospelChat />
        <Schedule />
        <Sacraments />
        <News />
        <Contacts />
      </main>
      <Footer />
      <MobileCallButton />
    </>
  )
}

export default App
