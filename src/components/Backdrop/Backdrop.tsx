import { useEffect, useRef } from 'react';
import './Backdrop.css';

// Символы фона - то, из чего «нарисованы» игры: стенки, клетки, стрелки, биты
const GLYPHS = '01<>[]{}/\\|-+=*#$%&~:;.?!░▒│─┼┤├┴┬╳';
const CELL = 18;
const FRAME_MS = 110;

// Тусклый «дождь» из символов в стиле терминала. Колонки редкие и медленные, чтобы фон
// не отвлекал от игры. Рисуется на canvas: так дешевле, чем сотни DOM-элементов
export default function Backdrop() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');

    if (!canvas || !context) {
      return;
    }

    const styles = getComputedStyle(document.documentElement);
    const accent = styles.getPropertyValue('--accent').trim() || '#5af78e';
    const paper = styles.getPropertyValue('--paper').trim() || '#0a0e0b';
    const font = getComputedStyle(document.body).fontFamily;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const glyph = () => GLYPHS[Math.floor(Math.random() * GLYPHS.length)];

    let columns: number[] = [];
    let width = 0;
    let height = 0;

    const resize = () => {
      const ratio = window.devicePixelRatio || 1;
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.font = `13px ${ font }`;
      context.textBaseline = 'top';
      // Голова каждой колонки стартует со случайной высоты, часть колонок пустует
      columns = Array.from({ length: Math.ceil(width / CELL) }, () => -Math.floor(Math.random() * 60));
      context.fillStyle = paper;
      context.fillRect(0, 0, width, height);
    };

    // Неподвижная россыпь символов - вместо анимации, если пользователь просил меньше движения
    const drawStatic = () => {
      context.fillStyle = accent;

      for (let x = 0; x < width; x += CELL) {
        for (let y = 0; y < height; y += CELL) {
          if (Math.random() < 0.08) {
            context.globalAlpha = 0.15 + Math.random() * 0.35;
            context.fillText(glyph(), x, y);
          }
        }
      }

      context.globalAlpha = 1;
    };

    const step = () => {
      // Полупрозрачная заливка вместо очистки - так за головой тянется гаснущий след
      context.fillStyle = paper;
      context.globalAlpha = 0.12;
      context.fillRect(0, 0, width, height);
      context.globalAlpha = 1;
      context.fillStyle = accent;

      columns.forEach((row, index) => {
        if (row >= 0) {
          context.fillText(glyph(), index * CELL, row * CELL);
        }

        columns[index] = row * CELL > height && Math.random() > 0.97 ? -Math.floor(Math.random() * 40) : row + 1;
      });
    };

    resize();

    if (reducedMotion) {
      drawStatic();
      window.addEventListener('resize', resize);
      window.addEventListener('resize', drawStatic);

      return () => {
        window.removeEventListener('resize', resize);
        window.removeEventListener('resize', drawStatic);
      };
    }

    let timer: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (timer === null) {
        timer = setInterval(step, FRAME_MS);
      }
    };
    const stop = () => {
      if (timer !== null) {
        clearInterval(timer);
        timer = null;
      }
    };
    // В скрытой вкладке анимация не нужна - не тратим батарею
    const onVisibility = () => (document.hidden ? stop() : start());

    start();
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      stop();
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return (
    <div className="backdrop" aria-hidden="true">
      <canvas ref={ canvasRef } />
    </div>
  );
}
