import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform, useScroll } from "framer-motion";
import { SiGithub, SiLinkedin } from "react-icons/si";
import { FaDatabase, FaBrain, FaEnvelope, FaDownload, FaExternalLinkAlt } from "react-icons/fa";
import { LayoutDashboard, Share2, Database, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import MazeSolver from "../../components/MazeSolver";

function Cursor() {
  const [pos, setPos] = useState({ x: -100, y: -100 });
  const [ring, setRing] = useState({ x: -100, y: -100 });
  const [big, setBig] = useState(false);
  useEffect(() => {
    const m = (e: MouseEvent) => { setPos({ x: e.clientX, y: e.clientY }); setTimeout(() => setRing({ x: e.clientX, y: e.clientY }), 70); };
    window.addEventListener("mousemove", m);
    const over = () => setBig(true); const out = () => setBig(false);
    document.querySelectorAll("a,button").forEach(el => { el.addEventListener("mouseenter", over); el.addEventListener("mouseleave", out); });
    return () => window.removeEventListener("mousemove", m);
  }, []);
  return (<>
    <div className="cursor-dot" style={{ left: pos.x, top: pos.y }} />
    <div className={`cursor-ring${big ? " expand" : ""}`} style={{ left: ring.x, top: ring.y }} />
  </>);
}

function Particles() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current!; if (!c) return;
    const ctx = c.getContext("2d")!;
    const resize = () => { c.width = window.innerWidth; c.height = window.innerHeight; };
    resize(); window.addEventListener("resize", resize);
    const pts = Array.from({ length: 70 }, () => ({ x: Math.random() * c.width, y: Math.random() * c.height, vx: (Math.random() - .5) * .35, vy: (Math.random() - .5) * .35, r: Math.random() * 1.8 + .4, a: Math.random() * .5 + .1 }));
    let raf: number;
    const draw = () => {
      ctx.clearRect(0, 0, c.width, c.height);
      pts.forEach(p => { p.x += p.vx; p.y += p.vy; if (p.x < 0) p.x = c.width; if (p.x > c.width) p.x = 0; if (p.y < 0) p.y = c.height; if (p.y > c.height) p.y = 0; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fillStyle = `rgba(255,107,0,${p.a})`; ctx.fill(); });
      for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) { const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y, d = Math.hypot(dx, dy); if (d < 110) { ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[j].x, pts[j].y); ctx.strokeStyle = `rgba(255,107,0,${.07 * (1 - d / 110)})`; ctx.lineWidth = .5; ctx.stroke(); } }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={ref} style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }} />;
}

function EnterOverlay({ onEnter }: { onEnter: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const c = canvasRef.current!;
    if (!c) return;
    const ctx = c.getContext("2d")!;
    const resize = () => { c.width = window.innerWidth; c.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);

    const PARTICLE_COUNT = 200;
    const particles = Array.from({ length: PARTICLE_COUNT }, () => ({
      x: Math.random() * c.width,
      y: Math.random() * c.height,
      vx: (Math.random() - 0.5) * 0.6,
      vy: (Math.random() - 0.5) * 0.6,
      r: Math.random() * 2.5 + 0.5,
      baseAlpha: Math.random() * 0.7 + 0.2,
      pulse: Math.random() * Math.PI * 2,
    }));

    const onMove = (e: MouseEvent) => { mouseRef.current = { x: e.clientX, y: e.clientY }; };
    window.addEventListener("mousemove", onMove);

    let raf: number;
    const draw = () => {
      ctx.clearRect(0, 0, c.width, c.height);
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      // Mouse glow
      const glow = ctx.createRadialGradient(mx, my, 0, mx, my, 220);
      glow.addColorStop(0, "rgba(255,107,0,0.12)");
      glow.addColorStop(0.5, "rgba(255,107,0,0.04)");
      glow.addColorStop(1, "transparent");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, c.width, c.height);

      particles.forEach(p => {
        p.pulse += 0.02;
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = c.width;
        if (p.x > c.width) p.x = 0;
        if (p.y < 0) p.y = c.height;
        if (p.y > c.height) p.y = 0;

        // Mouse repulsion
        const dx = p.x - mx;
        const dy = p.y - my;
        const dist = Math.hypot(dx, dy);
        if (dist < 150) {
          const force = (150 - dist) / 150 * 0.8;
          p.x += (dx / dist) * force;
          p.y += (dy / dist) * force;
        }

        const alpha = p.baseAlpha * (0.6 + 0.4 * Math.sin(p.pulse));
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,107,0,${alpha})`;
        ctx.fill();
      });

      // Connection lines
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const d = Math.hypot(dx, dy);
          if (d < 90) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(255,107,0,${0.12 * (1 - d / 90)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); window.removeEventListener("mousemove", onMove); };
  }, []);

  const handleClick = () => {
    setExiting(true);
    setTimeout(() => onEnter(), 900);
  };

  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={exiting ? { opacity: 0, scale: 1.3, rotateX: 15 } : { opacity: 1 }}
      transition={{ duration: 0.9, ease: [0.76, 0, 0.24, 1] }}
      style={{
        position: "absolute", inset: 0, zIndex: 100,
        background: "radial-gradient(ellipse at center, #0a0a0a 0%, #050505 60%, #000 100%)",
        display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center",
        perspective: 1200, transformStyle: "preserve-3d",
      }}
    >
      <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, pointerEvents: "none" }} />

      {/* Subtitle */}
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.8 }}
        style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.85rem", letterSpacing: "0.3em", textTransform: "uppercase", fontWeight: 500, marginBottom: 16, zIndex: 10 }}
      >
        Ashutosh Amale
      </motion.p>

      {/* Title */}
      <motion.h1
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.8 }}
        style={{
          fontSize: "clamp(2rem, 5vw, 4rem)", fontWeight: 800, zIndex: 10,
          background: "linear-gradient(135deg, #FF6B00, #FF8C42, #FFB347)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          marginBottom: 40, textAlign: "center", lineHeight: 1.2,
        }}
      >
        AI & Software Engineer
      </motion.h1>

      {/* Enter Button */}
      <motion.button
        onClick={handleClick}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.8, duration: 0.6, type: "spring" }}
        whileHover={{ scale: 1.08, boxShadow: "0 0 60px rgba(255,107,0,0.5), 0 0 120px rgba(255,107,0,0.2)" }}
        whileTap={{ scale: 0.95 }}
        style={{
          padding: "18px 52px", fontSize: "1.1rem", fontWeight: 700,
          background: "linear-gradient(135deg, #FF6B00, #FF8C42)",
          color: "white", border: "none", borderRadius: 50, cursor: "pointer",
          letterSpacing: "0.08em", zIndex: 10, position: "relative",
          boxShadow: "0 10px 40px rgba(255,107,0,0.35), inset 0 1px 0 rgba(255,255,255,0.2)",
          textTransform: "uppercase",
        }}
      >
        Enter Portfolio
      </motion.button>

      {/* Scroll hint */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.3 }}
        transition={{ delay: 1.2, duration: 1 }}
        style={{ position: "absolute", bottom: 40, color: "white", fontSize: "0.75rem", letterSpacing: "0.15em", zIndex: 10 }}
      >
        CLICK TO BEGIN
      </motion.p>
    </motion.div>
  );
}

function FullScreenVideo() {
  const [started, setStarted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleStart = () => {
    setStarted(true);
    setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.play().catch(e => console.error("Video play failed:", e));
      }
    }, 100);
  };

  return (
    <section id="home" style={{ height: "100vh", width: "100vw", position: "relative", overflow: "hidden" }}>
      {!started && <EnterOverlay onEnter={handleStart} />}
      <video ref={videoRef} src="/hero-video.mp4" playsInline style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(15,23,42,0.8) 100%)", pointerEvents: "none" }} />
      
      <motion.div animate={{ y: [0, 10, 0] }} transition={{ repeat: Infinity, duration: 2 }} style={{ position: "absolute", bottom: 40, left: "50%", transform: "translateX(-50%)", color: "white", display: "flex", flexDirection: "column", alignItems: "center", gap: 5, fontSize: "0.85rem", zIndex: 10, textShadow: "0 2px 4px rgba(0,0,0,0.5)", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" }}>
        Scroll Down
        <ChevronDown size={24} />
      </motion.div>
    </section>
  );
}

function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const links = ["home", "about", "services", "projects", "skills", "contact"];
  useEffect(() => { const s = () => setScrolled(window.scrollY > 50); window.addEventListener("scroll", s); return () => window.removeEventListener("scroll", s); }, []);
  const go = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  return (
    <motion.nav initial={{ y: -70, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: .6, delay: .1 }}
      style={{ position: "fixed", inset: "0 0 auto", zIndex: 100, height: 66, padding: "0 6%", display: "flex", alignItems: "center", justifyContent: "space-between", background: scrolled ? "rgba(15,23,42,.9)" : "transparent", backdropFilter: scrolled ? "blur(18px)" : "none", borderBottom: scrolled ? "1px solid rgba(255,255,255,.06)" : "none", transition: "all .3s" }}>
      <div style={{ fontWeight: 800, fontSize: "1.2rem" }}><span className="gradient-text">AA</span><span style={{ color: "rgba(255,255,255,.82)", marginLeft: 6 }}>Ashutosh</span></div>
      <div style={{ display: "flex", gap: 28 }} className="hide-mobile">
        {links.map(l => <button key={l} onClick={() => go(l)} style={{ background: "none", border: "none", color: "rgba(255,255,255,.6)", cursor: "pointer", fontFamily: "inherit", fontSize: ".88rem", fontWeight: 500, textTransform: "capitalize", transition: "color .2s" }} onMouseEnter={e => (e.currentTarget.style.color = "#FF6B00")} onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,.6)")}>{l}</button>)}
      </div>
      <button className="btn-primary" onClick={() => go("contact")} style={{ padding: "8px 18px", fontSize: ".83rem" }}>Hire Me</button>
    </motion.nav>
  );
}

function Hero() {
  const ref = useRef(null);
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 80%", "end 50%"] });
  const scale = useTransform(scrollYProgress, [0, 1], [0.95, 1]);
  const sectionOpacity = useTransform(scrollYProgress, [0, 1], [0, 1]);

  const text = "I am Ashutosh Amale, a Computer Engineering student with a strong interest in Artificial Intelligence, Data Science, and Software Engineering. My experience spans machine learning model development, data analytics, full-stack web applications, and AI deployment. I enjoy solving complex problems through technology and building products that create real-world impact. With hands-on experience in React, FastAPI, Python, SQL, and Machine Learning, I focus on transforming raw data into meaningful insights and scalable solutions.";
  const words = text.split(" ");

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - rect.left) / rect.width);
    my.set((e.clientY - rect.top) / rect.height);
  };
  const handleMouseLeave = () => { mx.set(0.5); my.set(0.5); };
  const rotateX = useTransform(my, [0, 1], [15, -15]);
  const rotateY = useTransform(mx, [0, 1], [-15, 15]);
  const springX = useSpring(rotateX, { stiffness: 300, damping: 30 });
  const springY = useSpring(rotateY, { stiffness: 300, damping: 30 });

  return (
    <motion.section ref={ref} style={{ scale, opacity: sectionOpacity, padding: "120px 6%", position: "relative", minHeight: "100vh", display: "flex", alignItems: "center" }}>
      <div style={{ position: "absolute", top: "20%", right: "10%", width: 300, height: 300, background: "radial-gradient(circle, rgba(255,107,0,0.15) 0%, transparent 70%)", filter: "blur(40px)" }} />
      <div style={{ position: "absolute", bottom: "10%", left: "5%", width: 200, height: 200, background: "radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 70%)", filter: "blur(30px)" }} />
      <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 60, alignItems: "center", width: "100%" }} className="hero-grid">
        {/* Left: Portrait with 3D tilt */}
        <motion.div initial={{ y: 60, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} transition={{ duration: 0.8 }} viewport={{ once: true }}>
          <div style={{ position: "relative", perspective: 1000 }} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
            <motion.img src="/portrait.png" alt="Ashutosh Amale" style={{ width: "100%", height: 500, objectFit: "cover", borderRadius: 24, boxShadow: "0 30px 60px rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.08)", rotateX: springX, rotateY: springY, transformStyle: "preserve-3d" }} />
            <div style={{ position: "absolute", bottom: 20, left: 20, display: "flex", gap: 16 }}>
              <a href="https://github.com/Ashutosh-0509" target="_blank" rel="noopener noreferrer" style={{ color: "rgba(255,255,255,0.7)", fontSize: "1.4rem", transition: "color 0.2s" }} onMouseEnter={e => (e.currentTarget.style.color = "#FF6B00")} onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.7)")}><SiGithub /></a>
              <a href="https://www.linkedin.com/in/ashutosh-amale-4645b4327/" target="_blank" rel="noopener noreferrer" style={{ color: "rgba(255,255,255,0.7)", fontSize: "1.4rem", transition: "color 0.2s" }} onMouseEnter={e => (e.currentTarget.style.color = "#FF6B00")} onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.7)")}><SiLinkedin /></a>
            </div>
          </div>
        </motion.div>
        {/* Right: Cinematic text reveal + floating objects */}
        <div style={{ position: "relative" }}>
          <motion.div initial={{ y: 60, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} transition={{ duration: 0.8 }} viewport={{ once: true }}>
            <p style={{ color: "#FF6B00", fontWeight: 600, letterSpacing: ".1em", fontSize: ".82rem", textTransform: "uppercase", marginBottom: 6 }}>About Me</p>
            <h2 style={{ fontSize: "clamp(2rem,4vw,3.5rem)", fontWeight: 800, color: "white", letterSpacing: "-.02em", marginBottom: 30 }}>Who I Am</h2>
          </motion.div>
          <p style={{ fontSize: "1.1rem", lineHeight: 1.8, color: "white", display: "flex", flexWrap: "wrap", gap: "6px 8px" }}>
            {words.map((word, i) => {
              const start = i / words.length;
              const end = start + (1 / words.length);
              const wordOpacity = useTransform(scrollYProgress, [start, end], [0.2, 1]);
              return <motion.span key={i} style={{ opacity: wordOpacity }}>{word}</motion.span>;
            })}
          </p>
          {/* Floating AI objects */}
          <div style={{ position: "absolute", top: -40, right: -40, pointerEvents: "none" }}>
            <motion.div animate={{ y: [0, -20, 0], rotate: 360 }} transition={{ y: { duration: 4, repeat: Infinity, ease: "easeInOut" }, rotate: { duration: 20, repeat: Infinity, ease: "linear" } }} style={{ color: "#3B82F6" }}><Share2 size={48} /></motion.div>
          </div>
          <div style={{ position: "absolute", bottom: -30, right: 20, pointerEvents: "none" }}>
            <motion.div animate={{ y: [0, 20, 0], rotate: -360 }} transition={{ y: { duration: 5, repeat: Infinity, ease: "easeInOut" }, rotate: { duration: 25, repeat: Infinity, ease: "linear" } }} style={{ color: "#FF6B00" }}><FaBrain size={40} /></motion.div>
          </div>
        </div>
      </div>
      <style>{`@media(max-width:768px){.hero-grid{grid-template-columns:1fr!important; gap: 40px!important}}`}</style>
    </motion.section>
  );
}

function ProjectsMarquee() {
  const items1 = ["Heart Attack Prediction", "RetailPro POS", "AI Analytics Dashboard", "Autonomous Robot"];
  const items2 = ["Data Visualization", "ML Research Paper", "Predictive Modeling", "Full-Stack AI Solutions"];
  return (
    <div style={{ padding: "60px 0", background: "rgba(15,23,42,0.5)", borderTop: "1px solid rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.05)", transform: "rotate(-2deg) scale(1.05)", zIndex: 10, position: "relative" }}>
      <div className="marquee-container" style={{ marginBottom: 24 }}>
        <div className="marquee-track marquee-scroll-left">
          {[...items1, ...items1, ...items1].map((item, i) => (
            <div key={i} className="glass" style={{ padding: "20px 40px", borderRadius: 100, fontSize: "1.1rem", fontWeight: 600, color: "white", whiteSpace: "nowrap" }}>{item}</div>
          ))}
        </div>
      </div>
      <div className="marquee-container">
        <div className="marquee-track marquee-scroll-right">
          {[...items2, ...items2, ...items2].map((item, i) => (
            <div key={i} className="glass" style={{ padding: "20px 40px", borderRadius: 100, fontSize: "1.1rem", fontWeight: 600, color: "white", whiteSpace: "nowrap" }}>{item}</div>
          ))}
        </div>
      </div>
    </div>
  );
}



function Services() {
  const services = [
    { num: "01", title: "Data Science", desc: "Transforming raw data into actionable business insights using analytics, visualization, and predictive modeling." },
    { num: "02", title: "Machine Learning", desc: "Building intelligent systems using classification, regression, forecasting, and AI-powered automation." },
    { num: "03", title: "Full-Stack Development", desc: "Developing scalable web applications using React, Node.js, FastAPI, and modern cloud deployment practices." },
    { num: "04", title: "Data Engineering", desc: "Designing ETL pipelines, database systems, API integrations, and efficient data workflows." },
    { num: "05", title: "AI Solutions", desc: "Deploying production-ready AI applications that solve real-world challenges across industries." }
  ];
  return (
    <section id="services" style={{ padding: "120px 6%", background: "rgba(15,23,42,0.4)" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
         <motion.div initial={{ y: 50, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} transition={{ duration: 0.6 }} viewport={{ once: true }}>
            <h2 style={{ fontSize: "clamp(2rem,4vw,3.5rem)", fontWeight: 800, color: "white", marginBottom: 50 }}>Capabilities</h2>
         </motion.div>
         <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>
            {services.map((s, i) => (
               <motion.div key={s.num} initial={{ y: 30, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} transition={{ delay: i * 0.1, duration: 0.5 }} viewport={{ once: true }} className="glass project-card" style={{ padding: 40, borderRadius: 16 }}>
                 <div style={{ color: "#FF6B00", fontSize: "1.2rem", fontWeight: 700, marginBottom: 16 }}>{s.num}</div>
                 <h3 style={{ color: "white", fontSize: "1.5rem", fontWeight: 700, marginBottom: 16 }}>{s.title}</h3>
                 <p style={{ color: "rgba(255,255,255,0.6)", lineHeight: 1.7 }}>{s.desc}</p>
               </motion.div>
            ))}
         </div>
      </div>
    </section>
  );
}

function Projects() {
  const projectsData = [
    {
      num: "01",
      title: "Heart Attack Prediction System",
      cat: "Machine Learning",
      desc: "Designed and deployed a machine learning model achieving 89% accuracy for heart attack risk prediction using Scikit-learn, FastAPI, and Vercel.",
      images: ["/hailuo.mp4"],
      color: "#EF4444",
      link: "https://heart-attack-pi.vercel.app/"
    },
    {
      num: "02",
      title: "RetailPro POS",
      cat: "AI + Full Stack",
      desc: "AI-powered retail intelligence platform with demand forecasting, inventory management, and analytics dashboard.",
      images: ["/retail.mp4"],
      color: "#3B82F6",
      link: "https://infotact-project1.vercel.app"
    },
    {
      num: "03",
      title: "Autonomous Maze Solving Robot",
      cat: "Embedded AI",
      desc: "Autonomous robotic system presented at IIT Bombay using sensor fusion, embedded programming, and real-time navigation logic.",
      images: ["MAZE_SIMULATION"],
      color: "#10B981",
      link: "https://linkedin.com"
    }
  ];

  const [activeIndex, setActiveIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [exitY, setExitY] = useState(0);
  const [enterY, setEnterY] = useState(700);
  const [isHovered, setIsHovered] = useState(false);
  const [shufflingIndex, setShufflingIndex] = useState<number | null>(null);
  const [shufflingDir, setShufflingDir] = useState<'left' | 'right' | null>(null);
  const [draggedX, setDraggedX] = useState<number>(0);

  const nextCard = (dir: 'left' | 'right' = 'right') => {
    if (shufflingIndex !== null) return;
    setShufflingIndex(activeIndex);
    setShufflingDir(dir);
  };

  const prevCard = () => {
    if (shufflingIndex !== null) return;
    const prevIndex = (activeIndex - 1 + projectsData.length) % projectsData.length;
    setShufflingIndex(prevIndex);
    setShufflingDir('left');
  };

  const handleAnimationComplete = (i: number) => {
    if (shufflingIndex === i) {
      if (shufflingIndex === activeIndex) {
        setActiveIndex((prev) => (prev + 1) % projectsData.length);
      } else {
        setActiveIndex(shufflingIndex);
      }
      setShufflingIndex(null);
      setShufflingDir(null);
    }
  };

  const getCardStyles = (i: number) => {
    const total = projectsData.length;

    if (shufflingIndex === i) {
      const isNext = shufflingIndex === activeIndex;
      if (isNext) {
        return {
          x: shufflingDir === 'left' ? -600 : 600,
          y: 10,
          scale: 0.95,
          rotate: shufflingDir === 'left' ? -12 : 12,
          opacity: 0,
          zIndex: 10,
        };
      } else {
        return {
          x: shufflingDir === 'left' ? -600 : 600,
          y: 0,
          scale: 1,
          rotate: shufflingDir === 'left' ? -12 : 12,
          opacity: 0,
          zIndex: 10,
        };
      }
    }

    const position = (i - activeIndex + total) % total;

    let x = 0;
    let y = 0;
    let scale = 1;
    let rotate = 0;
    let opacity = 1;
    let zIndex = total - position;

    if (position === 0) {
      x = 0;
      y = 0;
      scale = 1;
      rotate = 0;
      opacity = 1;
    } else if (position === 1) {
      x = 0;
      y = 30;
      scale = 0.94;
      rotate = 0;
      opacity = 0.3;
    } else {
      x = 0;
      y = 55;
      scale = 0.88;
      rotate = 0;
      opacity = 0.15;
    }

    return { x, y, scale, rotate, opacity, zIndex };
  };

  return (
    <section id="projects" style={{ padding: "120px 6%", position: "relative", overflow: "hidden" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
         <motion.div initial={{ y: 50, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} transition={{ duration: 0.6 }} viewport={{ once: true }} style={{ marginBottom: 60, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
            <div>
               <h2 style={{ fontSize: "clamp(2rem,4vw,3.5rem)", fontWeight: 800, color: "white" }}>Selected Work</h2>
               <div className="section-title-line" />
            </div>
            
            <div style={{ display: "flex", gap: 16 }} className="hide-mobile">
              <button onClick={prevCard} className="deck-nav-btn" aria-label="Previous project">
                <ChevronLeft size={24} />
              </button>
              <button onClick={() => nextCard('right')} className="deck-nav-btn" aria-label="Next project">
                <ChevronRight size={24} />
              </button>
            </div>
         </motion.div>

         <div 
           className="projects-deck-container"
           onMouseEnter={() => setIsHovered(true)}
           onMouseLeave={() => setIsHovered(false)}
         >
            {projectsData.map((p, i) => {
              const cardStyle = getCardStyles(i);
              const position = (i - activeIndex + projectsData.length) % projectsData.length;
              const isTop = position === 0 && shufflingIndex === null;
              const currentRotate = isTop && draggedX !== 0 ? draggedX / 25 : cardStyle.rotate;

              return (
                <motion.div
                  key={p.title}
                  className="glass"
                  drag={isTop ? "x" : false}
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.8}
                  onDrag={(e, info) => {
                    if (isTop) setDraggedX(info.offset.x);
                  }}
                  onDragEnd={(e, info) => {
                    if (!isTop) return;
                    const swipeThreshold = 140;
                    if (info.offset.x > swipeThreshold) {
                      nextCard('right');
                    } else if (info.offset.x < -swipeThreshold) {
                      nextCard('left');
                    }
                    setDraggedX(0);
                  }}
                  animate={{
                    x: shufflingIndex === i ? cardStyle.x : (isTop && draggedX !== 0 ? draggedX : cardStyle.x),
                    y: cardStyle.y,
                    scale: cardStyle.scale,
                    rotate: currentRotate,
                    opacity: cardStyle.opacity,
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 260,
                    damping: 26,
                  }}
                  style={{
                    position: "absolute",
                    width: "100%",
                    minHeight: "50vh",
                    padding: "4vw",
                    borderRadius: 24,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    borderTop: `4px solid ${p.color}`,
                    zIndex: cardStyle.zIndex,
                    cursor: isTop ? "grab" : "default",
                    touchAction: "none",
                  }}
                  whileTap={isTop ? { cursor: "grabbing" } : {}}
                  onAnimationComplete={() => handleAnimationComplete(i)}
                >
                   <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 24 }}>
                      <div style={{ flex: 1, minWidth: 300 }}>
                         <div style={{ color: p.color, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12, fontSize: "0.9rem" }}>{p.cat}</div>
                         <h3 style={{ color: "white", fontSize: "clamp(1.8rem, 3vw, 2.5rem)", fontWeight: 800, marginBottom: 20 }}>{p.title}</h3>
                         <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "1.1rem", lineHeight: 1.6, maxWidth: 600 }}>{p.desc}</p>
                      </div>
                      <button className="btn-primary" style={{ background: p.color, display: "flex", alignItems: "center", gap: 8 }} onClick={(e) => { e.stopPropagation(); window.open(p.link, "_blank"); }}>View Project <FaExternalLinkAlt size={12} /></button>
                   </div>
                   
                   <div style={{ display: "flex", gap: 16, marginTop: 40, flex: 1, minHeight: 200, flexWrap: "wrap" }}>
                      {p.images.map((img, j) => {
                        const isVideo = img.endsWith('.mp4');
                        const isSimulation = img === 'MAZE_SIMULATION';
                        return (
                          <div key={j} style={{ flex: isVideo || isSimulation ? "1 1 100%" : "1 1 200px", background: `linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.01))`, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(255,255,255,0.05)", position: "relative", overflow: "hidden", minHeight: isVideo ? 350 : isSimulation ? 450 : 150 }} className="project-card">
                            {isVideo ? (
                              <video src={img} autoPlay muted loop playsInline style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            ) : isSimulation ? (
                              <MazeSolver color={p.color} />
                            ) : (
                              <>
                                <div style={{ position: "absolute", inset: 0, background: `radial-gradient(circle at center, ${p.color}15, transparent 70%)` }} />
                                <span style={{ color: "rgba(255,255,255,0.8)", fontWeight: 600, fontSize: "0.95rem", zIndex: 1, textAlign: "center", padding: 10 }}>{img}</span>
                              </>
                            )}
                          </div>
                        );
                      })}
                   </div>
                </motion.div>
              );
            })}
         </div>

         <div style={{ display: "none", gap: 20, justifyContent: "center", marginTop: 24 }} className="show-mobile-flex">
           <button onClick={prevCard} className="deck-nav-btn" aria-label="Previous project">
             <ChevronLeft size={20} />
           </button>
           <button onClick={() => nextCard('right')} className="deck-nav-btn" aria-label="Next project">
             <ChevronRight size={20} />
           </button>
         </div>

         <div className="deck-dots-container">
           {projectsData.map((_, i) => (
             <div
               key={i}
               className={`deck-dot ${i === activeIndex ? "active" : ""}`}
               onClick={() => {
                 if (shufflingIndex !== null) return;
                 if (i === activeIndex) return;
                 setShufflingIndex(activeIndex);
                 setShufflingDir(i > activeIndex ? 'right' : 'left');
                 setActiveIndex(i);
               }}
             />
           ))}
         </div>
      </div>
      <style>{`
        @media (max-width: 768px) {
          .hide-mobile { display: none !important; }
          .show-mobile-flex { display: flex !important; }
        }
      `}</style>
    </section>
  );
}

function Experience() {
  const timeline = [
    { year: "2024", role: "Web Development Intern", company: "Infotact Solutions" },
    { year: "2025", role: "Machine Learning Projects", company: "" },
    { year: "2026", role: "Research Publication", company: "" },
    { year: "Future", role: "AI Engineer / Data Scientist", company: "" }
  ];
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 80%", "end 50%"] });
  const height = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  return (
    <section id="experience" style={{ padding: "120px 6%", background: "rgba(15,23,42,0.4)" }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <h2 style={{ fontSize: "clamp(2rem,4vw,3.5rem)", fontWeight: 800, color: "white", textAlign: "center", marginBottom: 80 }}>Journey</h2>
        <div ref={ref} style={{ position: "relative", paddingLeft: 40 }}>
           <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, background: "rgba(255,255,255,0.05)", borderRadius: 2 }} />
           <motion.div style={{ position: "absolute", left: 0, top: 0, width: 4, height, background: "linear-gradient(to bottom, #FF6B00, #FF8C42)", borderRadius: 2, boxShadow: "0 0 20px rgba(255,107,0,0.8)" }} />
           
           {timeline.map((item, i) => (
             <motion.div key={item.year} initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.2 }} viewport={{ once: true, margin: "-100px" }} style={{ position: "relative", marginBottom: 60 }}>
               <div style={{ position: "absolute", left: -46, top: 10, width: 16, height: 16, borderRadius: "50%", background: "#FF6B00", border: "3px solid #0F172A", boxShadow: "0 0 15px rgba(255,107,0,0.8)", zIndex: 2 }} />
               <h3 style={{ color: "#FF6B00", fontSize: "1.2rem", fontWeight: 700, marginBottom: 8 }}>{item.year}</h3>
               <div className="glass project-card" style={{ padding: 24, borderRadius: 16 }}>
                 <div style={{ color: "white", fontSize: "1.3rem", fontWeight: 700 }}>{item.role}</div>
                 {item.company && <div style={{ color: "rgba(255,255,255,0.6)", marginTop: 4 }}>{item.company}</div>}
               </div>
             </motion.div>
           ))}
        </div>
      </div>
    </section>
  );
}

function SkillCard({ cat }: { cat: { title: string, items: string[] } }) {
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const rotateX = useTransform(my, [0, 1], [15, -15]);
  const rotateY = useTransform(mx, [0, 1], [-15, 15]);
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    mx.set(x); my.set(y);
  };
  return (
    <motion.div onMouseMove={handleMouseMove} onMouseLeave={() => { mx.set(0.5); my.set(0.5); }} style={{ rotateX, rotateY, transformStyle: "preserve-3d", perspective: 1000 }} className="glass project-card">
      <div style={{ padding: 32, borderRadius: 16, height: "100%", border: "1px solid rgba(255,255,255,0.05)", background: "linear-gradient(180deg, rgba(255,255,255,0.03), transparent)" }}>
         <h3 style={{ color: "#FF6B00", fontSize: "1.3rem", fontWeight: 800, marginBottom: 24, transform: "translateZ(30px)" }}>{cat.title}</h3>
         <div style={{ display: "flex", flexWrap: "wrap", gap: 12, transform: "translateZ(20px)" }}>
           {cat.items.map(item => (
             <span key={item} style={{ background: "rgba(0,0,0,0.3)", padding: "8px 16px", borderRadius: 8, color: "white", fontSize: "0.95rem", border: "1px solid rgba(255,255,255,0.05)" }}>{item}</span>
           ))}
         </div>
      </div>
    </motion.div>
  );
}

function Skills() {
  const skillCategories = [
    { title: "AI & ML", items: ["Python", "Scikit-Learn", "Pandas", "NumPy"] },
    { title: "Data", items: ["SQL", "PostgreSQL", "MongoDB", "ETL"] },
    { title: "Development", items: ["React", "Node.js", "FastAPI"] },
    { title: "Tools", items: ["Git", "GitHub", "Vercel", "Postman"] }
  ];
  return (
    <section id="skills" style={{ padding: "120px 6%" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <motion.h2 initial={{ y: 50, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} style={{ fontSize: "clamp(2rem,4vw,3.5rem)", fontWeight: 800, color: "white", marginBottom: 60, textAlign: "center" }}>Technical Arsenal</motion.h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 32 }}>
           {skillCategories.map(cat => <SkillCard key={cat.title} cat={cat} />)}
        </div>
      </div>
    </section>
  );
}

function Contact() {
  const [mousePos, setMousePos] = useState({ x: "50%", y: "50%" });

  return (
    <section id="contact" className="spotlight-wrapper" onMouseMove={(e) => {
      const rect = e.currentTarget.getBoundingClientRect();
      setMousePos({ x: `${e.clientX - rect.left}px`, y: `${e.clientY - rect.top}px` });
    }} style={{ padding: "120px 6% 80px", minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" } as any}>
      <div className="grid-pattern" style={{ position: "absolute", inset: 0, opacity: 0.15 }} />
      <div className="spotlight-bg" style={{ "--mouse-x": mousePos.x, "--mouse-y": mousePos.y } as any} />
      
      <div style={{ maxWidth: 700, width: "100%", position: "relative", zIndex: 10, textAlign: "center" }}>
        {/* Heading */}
        <motion.h2 initial={{ y: 40, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} transition={{ duration: 0.7 }} viewport={{ once: true }} style={{ fontSize: "clamp(2rem, 4.5vw, 3.8rem)", fontWeight: 800, color: "white", lineHeight: 1.2, marginBottom: 16 }}>
          Let's Build Something{" "}
          <span style={{ background: "linear-gradient(135deg, #FF6B00, #FF8C42)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Amazing</span>
        </motion.h2>
        
        <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} transition={{ delay: 0.3 }} viewport={{ once: true }} style={{ color: "rgba(255,255,255,0.5)", fontSize: "1.05rem", lineHeight: 1.7, marginBottom: 48, maxWidth: 500, margin: "0 auto 48px" }}>
          Interested in AI, Data Science, or Software Development? Let's collaborate and create impactful solutions together.
        </motion.p>

        {/* Social buttons */}
        <motion.div initial={{ y: 20, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }} viewport={{ once: true }} style={{ display: "flex", justifyContent: "center", gap: 16, flexWrap: "wrap", marginBottom: 40 }}>
          {[
            { label: "LinkedIn", icon: <SiLinkedin size={18} />, href: "https://www.linkedin.com/in/ashutosh-amale-4645b4327/", target: "_blank" },
            { label: "GitHub", icon: <SiGithub size={18} />, href: "https://github.com/Ashutosh-0509", target: "_blank" },
            { label: "Email", icon: <FaEnvelope size={18} />, href: "mailto:ashutoshamale01@gmail.com", target: "_blank" },
            { label: "Resume", icon: <FaDownload size={18} />, href: "/resume.pdf", target: "_blank" }
          ].map((item) => (
            <motion.a key={item.label} href={item.href} target={item.target} rel="noopener noreferrer" whileHover={{ scale: 1.05, borderColor: "#FF6B00" }} whileTap={{ scale: 0.97 }} style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 24px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)", color: "white", textDecoration: "none", fontSize: "0.92rem", fontWeight: 600, background: "rgba(255,255,255,0.03)", backdropFilter: "blur(8px)", transition: "all 0.3s" }}>
              {item.icon} {item.label}
            </motion.a>
          ))}
        </motion.div>

        {/* CTA Button */}
        <motion.a href="mailto:ashutoshamale01@gmail.com" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} viewport={{ once: true }} className="btn-cta" style={{ display: "inline-block", textDecoration: "none" }} whileTap={{ scale: 0.95 }}>
          Contact Me Now
        </motion.a>
      </div>
    </section>
  );
}

const Index = () => (
  <div style={{ minHeight: "100vh", background: "#050505", color: "white" }}>
    <Cursor />
    <Particles />
    <Navbar />
    <motion.main initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: .5 }}>
      <FullScreenVideo />
      <Hero />
      <ProjectsMarquee />

      <Services />
      <Projects />
      <Experience />
      <Skills />
      <Contact />
      <footer style={{ borderTop: "1px solid rgba(255,255,255,.05)", padding: "40px 6%", textAlign: "center", color: "rgba(255,255,255,.3)", fontSize: ".9rem", background: "#050505" }}>
        © 2026 <span style={{ color: "#FF6B00" }}>Ashutosh Amale</span>. Building the future.
      </footer>
    </motion.main>
  </div>
);

export default Index;
