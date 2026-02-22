"use client";
import React, { useState, useEffect, useRef } from 'react';

export default function GyroAnalizPaneli() {
  const [mounted, setMounted] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginStatus, setLoginStatus] = useState({ type: '', message: '' });

  const [isConnected, setIsConnected] = useState(false);
  const [gyroData, setGyroData] = useState({ yon: 'Stabil', derece: 0 });
  const [history, setHistory] = useState<{time: string, data: string, id: number, uid: string}[]>([]);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const counterRef = useRef(0);
  const portRef = useRef<any>(null);
  const readerRef = useRef<any>(null);
  const keepReading = useRef(true);

  const getFullTimestamp = () => {
    const now = new Date();
    const date = now.toLocaleDateString('tr-TR');
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    const ms = String(now.getMilliseconds()).padStart(3, '0');
    return `${date} - ${h}:${m}:${s}.${ms}`;
  };

  useEffect(() => {
    setMounted(true);
    document.title = "Gyro Analiz Paneli";
    const savedLogin = localStorage.getItem('gyro_isLoggedIn');
    if (savedLogin === 'true') setIsLoggedIn(true);
    return () => { if (portRef.current) disconnectSerial(); };
  }, []);

  useEffect(() => {
    const container = scrollRef.current;
    if (container) {
      const isAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 50;
      if (isAtBottom) {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: 'auto'
        });
      }
    }
  }, [history]); 

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === 'deprem.sensoru' && password === '1234') {
      setIsLoggedIn(true);
      localStorage.setItem('gyro_isLoggedIn', 'true');
    } else {
      setLoginStatus({ type: 'error', message: '❌ Hatalı Giriş!' });
    }
  };

  const handleLogout = async () => {
    await disconnectSerial();
    setIsLoggedIn(false);
    localStorage.removeItem('gyro_isLoggedIn');
  };

  const disconnectSerial = async () => {
    keepReading.current = false;
    if (readerRef.current) {
      try { await readerRef.current.cancel(); readerRef.current.releaseLock(); } catch (e) {}
    }
    if (portRef.current) {
      try { await portRef.current.close(); } catch (e) {}
    }
    setIsConnected(false);
    setGyroData({ yon: 'Stabil', derece: 0 });
  };

  const connectSerial = async () => {
    if (isConnected) { await disconnectSerial(); return; }
    if (history.length === 0) { counterRef.current = 0; }

    try {
      // @ts-ignore
      const port = await navigator.serial.requestPort();
      await port.open({ baudRate: 9600 });
      portRef.current = port;
      setIsConnected(true);
      keepReading.current = true;
      const reader = port.readable.getReader();
      readerRef.current = reader;
      const decoder = new TextDecoder();
      let partialLine = "";

      while (keepReading.current) {
        const { value, done } = await reader.read();
        if (done) break;
        partialLine += decoder.decode(value, { stream: true });
        const lines = partialLine.split('\n');
        partialLine = lines.pop() || "";

        for (const line of lines) {
          const cleanValue = line.trim();
          if (!cleanValue) continue;
          
          const yonMatch = cleanValue.match(/Yon:\s*(\w+)/);
          const dereceMatch = cleanValue.match(/Derece:\s*([\d.]+)/);

          if (yonMatch && dereceMatch) {
            let rawYon = yonMatch[1].toLowerCase();
            let formatliYon = rawYon === "ileri" ? "İleri" : rawYon.charAt(0).toLocaleUpperCase('tr-TR') + rawYon.slice(1);
            setGyroData({ yon: formatliYon, derece: parseFloat(dereceMatch[1]) });
            
            counterRef.current += 1;
            
            // HATA ÇÖZÜMÜ BURADA: Artık her verinin sonuna rastgele benzersiz bir kod ekleniyor.
            const uniqueId = `${Date.now()}-${counterRef.current}-${Math.random().toString(36).substring(2, 9)}`;
            
            setHistory(prev => [...prev, { 
              time: getFullTimestamp(), 
              data: cleanValue, 
              id: counterRef.current, 
              uid: uniqueId 
            }].slice(-100));
          }
        }
      }
    } catch (e) { setIsConnected(false); }
  };

  // Dinamik Uyarı Fonksiyonu - SADELEŞTİRİLDİ (Not: yazısı kalktı)
  const getAlertStyle = () => {
    const d = gyroData.derece;
    if (d >= 3) return { bg: 'bg-red-600', text: '⚠️ Acil Tahliye ⚠️', opacity: 'opacity-100 scale-100' };
    if (d >= 2) return { bg: 'bg-orange-500', text: 'Tehlike!', opacity: 'opacity-100 scale-100' };
    if (d >= 1) return { bg: 'bg-yellow-400', text: 'Dikkat!', opacity: 'opacity-100 scale-100' };
    return { bg: 'bg-transparent', text: '', opacity: 'opacity-0 scale-95' };
  };

  const alert = getAlertStyle();

  if (!mounted) return null;

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6 text-black">
        <div className="bg-white w-full max-w-md p-10 rounded-[40px] shadow-2xl border-none">
          <h1 className="text-2xl font-black text-center mb-10">Giriş Yap</h1>
          <form onSubmit={handleLogin} className="space-y-6">
            <input type="text" placeholder="Kullanıcı" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full bg-slate-50 border rounded-2xl px-6 py-4" />
            <div className="relative w-full rounded-2xl">
              <input type={showPassword ? "text" : "password"} placeholder="Şifre" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-slate-50 border rounded-2xl px-6 py-4 pr-16" />
              <div className="absolute inset-y-0 right-0 flex items-center pr-4 cursor-pointer" onClick={() => setShowPassword(!showPassword)}>
                <div className="relative flex items-center justify-center w-10 h-10">
                  <span className="text-[30px] z-20">👁️</span>
                  <svg className={`absolute inset-0 w-full h-full z-30 transition-opacity ${showPassword ? 'opacity-100' : 'opacity-0'}`} viewBox="0 0 40 40">
                    <line x1="31" y1="9" x2="9" y2="31" stroke="black" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                </div>
              </div>
            </div>
            {loginStatus.message && <p className="text-red-500 font-bold text-center">{loginStatus.message}</p>}
            <button type="submit" className="w-full bg-slate-900 text-white font-bold py-5 rounded-full shadow-lg">Giriş</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-black p-6 font-sans">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col items-center mb-16 space-y-6">
          <div className="flex gap-4">
            <button onClick={connectSerial} style={{ backgroundColor: isConnected ? 'rgb(255, 0, 0)' : '' }} className={`px-12 py-4 rounded-full font-bold transition-all text-lg shadow-md border-0 ${isConnected ? 'text-white' : 'bg-slate-100 text-black hover:bg-slate-200'}`}>
              {isConnected ? "Bağlantıyı Kes" : "Arduino'ya Bağlan"}
            </button>
            <button onClick={handleLogout} style={{ backgroundColor: 'rgb(255, 0, 0)' }} className="text-white px-10 py-4 rounded-full font-bold hover:opacity-90 transition-colors shadow-md border-0">Çıkış Yap</button>
          </div>
          <h1 className="text-4xl font-black tracking-tight">Gyro Analiz Paneli</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            <div className="bg-slate-50 p-10 rounded-[40px] text-center shadow-sm">
              <span className="text-slate-400 font-bold tracking-widest uppercase text-xs">Yön</span>
              <div className="text-6xl font-black mt-2 tracking-tight">{gyroData.yon}</div>
            </div>
            <div className="bg-slate-50 p-10 rounded-[40px] text-center shadow-sm">
              <span className="text-slate-400 font-bold tracking-widest uppercase text-xs">Derece</span>
              <div className="text-6xl font-mono font-bold mt-2">{gyroData.derece.toFixed(2)}°</div>
            </div>

            {/* Uyarı Kutusu */}
            <div className={`md:col-span-2 p-8 rounded-[40px] text-center transition-all duration-500 min-h-[100px] flex items-center justify-center ${alert.bg} ${alert.opacity}`}>
               <div className="text-white text-4xl font-black tracking-wide drop-shadow-md">
                  {alert.text}
               </div>
            </div>
        </div>

        <div className="bg-white rounded-[40px] shadow-xl h-[500px] overflow-hidden flex flex-col border-0">
          <div className="px-8 py-6 border-b border-slate-100 flex justify-between bg-slate-50">
             <div className="flex gap-12 font-bold text-slate-400">
              <span className="w-12">No</span>
              <span className="w-64">Tarih Ve Saat</span>
              <span>Arduino Verisi</span>
            </div>
            <button onClick={() => { setHistory([]); counterRef.current = 0; }} className="bg-red-500 hover:bg-red-600 transition-colors text-white px-6 py-2 rounded-full text-xs font-bold shadow-sm border-0">Temizle</button>
          </div>
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-8 py-4 font-mono text-[13px]">
            {history.map((item) => (
              <div key={item.uid} className="flex gap-12 border-b border-slate-50 py-2 hover:bg-slate-50 transition-colors">
                <span className="w-12 text-slate-400 font-bold">{item.id}</span>
                <span className="w-64 text-blue-600 font-bold">{item.time}</span>
                <span className="font-black text-slate-800">{item.data}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}