import React from 'react';

export const renderFormattedText = (text: string) => {
  if (!text) return null;
  
  // Split by **text**, __text__ or blank placeholders like __ or ____ or ...
  // Regex: 
  // 1. **text** (bold)
  // 2. __text__ (underline)
  // 3. (___) or (....) or standalone ___ (blanks)
  const parts = text.split(/(\*\*[\s\S]*?\*\*|__[\s\S]*?__|__+|(?:\.{3,}))/g);
  
  return (
    <>
      {parts.map((part, index) => {
        if (!part) return null;

        // Bold
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={index}>{part.slice(2, -2)}</strong>;
        }
        
        // Underline (only if it has content, e.g. __word__)
        if (part.startsWith('__') && part.endsWith('__') && part.length > 4) {
          return <u key={index}>{part.slice(2, -2)}</u>;
        }

        // Blank space (standalone ___ or .... or (___))
        if (/^__+$/.test(part) || /^\.{3,}$/.test(part)) {
          return (
            <span 
              key={index} 
              className="inline-block border-b-2 border-slate-400 min-w-[80px] mx-1.5 h-4 relative -top-1"
              aria-label="blank space"
            ></span>
          );
        }
        
        // For normal text, handle newlines explicitly
        const lines = part.split('\n');
        return (
          <React.Fragment key={index}>
            {lines.map((line, lIndex) => (
              <React.Fragment key={lIndex}>
                {line}
                {lIndex < lines.length - 1 && <br />}
              </React.Fragment>
            ))}
          </React.Fragment>
        );
      })}
    </>
  );
};
