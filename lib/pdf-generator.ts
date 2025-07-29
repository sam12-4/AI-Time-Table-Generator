import jsPDF from 'jspdf';
import { SavedTimetable } from './mongodb';

// Import autoTable plugin
require('jspdf-autotable');

export function generateTimetablePDF(timetableData: SavedTimetable): void {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  // PDF dimensions
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15; // Reduced margin for more space

  // Colors (RGB values for jsPDF)
  const primaryColor = [30, 64, 175]; // Blue #1e40af
  const secondaryColor = [100, 116, 139]; // Gray #64748b

  // Header Section
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, pageWidth, 30, 'F'); // Reduced header height
  
  // University/College Header
  doc.setTextColor(255, 255, 255); // White
  doc.setFontSize(18); // Reduced font size
  doc.setFont('helvetica', 'bold');
  doc.text('Academic Institution', margin, 12);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Class Timetable', margin, 22);

  // Timetable Title and Info
  doc.setTextColor(0, 0, 0); // Black
  doc.setFontSize(14); // Reduced font size
  doc.setFont('helvetica', 'bold');
  doc.text(timetableData.name, margin, 40);

  // Metadata Section - Make it more compact
  doc.setFontSize(8); // Smaller font
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  
  const metadataY = 48;
  doc.text(`Generated: ${new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', // Shorter format
    day: 'numeric'
  })}`, margin, metadataY);
  
  doc.text(`Subjects: ${timetableData.metadata.totalSubjects}`, margin + 60, metadataY);
  doc.text(`Completion: ${timetableData.metadata.completionRate.toFixed(1)}%`, margin + 100, metadataY);
  doc.text(`Conflicts: ${timetableData.metadata.conflictCount}`, margin + 150, metadataY);

  if (timetableData.description) {
    doc.text(`${timetableData.description}`, margin, metadataY + 6);
  }

  // Prepare timetable data
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  
  // Get ALL unique time slots from the saved timetable data and sort them properly
  const uniqueTimeSlots = new Set<string>();
  timetableData.timeSlots.forEach(slot => {
    if (days.includes(slot.day)) {
      uniqueTimeSlots.add(slot.startTime);
    }
  });
  
  // Convert to sorted array
  let timeSlots = Array.from(uniqueTimeSlots).sort();
  
  // If no time slots found, use complete default periods
  if (timeSlots.length === 0) {
    timeSlots = [
      '08:30', '09:20', '10:10', // Morning periods
      '11:00', // Break
      '11:30', '12:20', // Pre-lunch periods
      '13:10', // Namaz break
      '14:00', '14:50', '15:40' // Afternoon periods
    ];
  }

  // Ensure we have all standard periods - add missing ones
  const standardPeriods = ['08:30', '09:20', '10:10', '11:00', '11:30', '12:20', '13:10', '14:00', '14:50', '15:40'];
  standardPeriods.forEach(period => {
    if (!timeSlots.includes(period)) {
      timeSlots.push(period);
    }
  });
  
  // Sort again after adding missing periods
  timeSlots.sort();

  // Create table headers
  const headers = ['Time Period', ...days];
  
  // Create table data
  const tableData: string[][] = [];
  
  console.log('All time slots for PDF:', timeSlots);
  console.log('Timetable entries:', timetableData.generatedTimetable.entries);
  
  timeSlots.forEach((startTime: string) => {
    // Find the corresponding time slot to get end time
    const timeSlot = timetableData.timeSlots.find(ts => ts.startTime === startTime);
    
    // Map standard end times for known periods
    const timeMapping: { [key: string]: string } = {
      '08:30': '09:20',
      '09:20': '10:10',
      '10:10': '11:00',
      '11:00': '11:30',
      '11:30': '12:20',
      '12:20': '13:10',
      '13:10': '14:00',
      '14:00': '14:50',
      '14:50': '15:40',
      '15:40': '16:30'
    };
    
    const endTime = timeSlot?.endTime || timeMapping[startTime] || '';
    const periodDisplay = endTime ? `${startTime}-${endTime}` : startTime;
    
    // Check if this is a break period
    const isBreak = startTime === '11:00' || startTime === '13:10';
    const breakLabel = startTime === '11:00' ? ' (Break)' : startTime === '13:10' ? ' (Namaz)' : '';
    
    const row: string[] = [periodDisplay + breakLabel];
    
    days.forEach(day => {
      // Find entry for this day and time
      const entry = timetableData.generatedTimetable.entries.find(
        e => e.day === day && e.startTime === startTime
      );
      
      if (entry && !isBreak) {
        // Find subject details
        const subject = timetableData.subjects.find(s => s.id === entry.subjectId);
        const subjectName = subject?.name || entry.subjectId || 'Unknown Subject';
        const teacher = entry.teacherId || 'TBD';
        const room = entry.roomId || 'TBD';
        
        const cellContent = `${subjectName}\n${teacher}\n${room}`;
        row.push(cellContent);
      } else if (isBreak) {
        // Mark break periods
        row.push(startTime === '11:00' ? 'BREAK' : 'NAMAZ BREAK');
      } else {
        row.push('');
      }
    });
    
    tableData.push(row);
  });

  console.log('Table data for PDF (rows):', tableData.length);
  console.log('All table data:', tableData);

  // Check if autoTable is available
  if (typeof (doc as any).autoTable === 'function') {
    // Generate the table using autoTable
    (doc as any).autoTable({
      head: [headers],
      body: tableData,
      startY: 58, // Start higher to fit more content
      theme: 'grid',
      headStyles: {
        fillColor: primaryColor,
        textColor: [255, 255, 255], // White
        fontSize: 9, // Smaller font
        fontStyle: 'bold',
        halign: 'center',
        cellPadding: 2
      },
      bodyStyles: {
        fontSize: 7, // Smaller font for more content
        cellPadding: 2, // Reduced padding
        valign: 'middle',
        halign: 'center',
        lineColor: [200, 200, 200],
        lineWidth: 0.5
      },
      columnStyles: {
        0: { 
          cellWidth: 25, 
          fillColor: [248, 250, 252], // #f8fafc
          fontStyle: 'bold',
          textColor: primaryColor,
          fontSize: 7
        },
        1: { cellWidth: (pageWidth - margin * 2 - 25) / 5 },
        2: { cellWidth: (pageWidth - margin * 2 - 25) / 5 },
        3: { cellWidth: (pageWidth - margin * 2 - 25) / 5 },
        4: { cellWidth: (pageWidth - margin * 2 - 25) / 5 },
        5: { cellWidth: (pageWidth - margin * 2 - 25) / 5 }
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252] // #f8fafc
      },
      margin: { left: margin, right: margin, top: margin, bottom: 35 }, // Leave space for footer
      pageBreak: 'auto', // Allow page breaks if needed
      rowPageBreak: 'avoid', // Try to keep rows together
      styles: {
        overflow: 'linebreak',
        cellWidth: 'wrap'
      },
      didDrawCell: function(data: any) {
        // Highlight break periods
        if (data.column.index === 0) {
          const cellText = data.cell.text[0];
          if (cellText.includes('Break') || cellText.includes('Namaz')) {
            doc.setFillColor(254, 243, 199); // #fef3c7
            doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F');
            doc.setTextColor(146, 64, 14); // #92400e
            doc.setFontSize(7);
            doc.setFont('helvetica', 'bold');
            doc.text(cellText, data.cell.x + data.cell.width/2, data.cell.y + data.cell.height/2, {
              align: 'center'
            });
          }
        }
        // Highlight break cells in day columns
        if (data.column.index > 0 && (data.cell.text[0] === 'BREAK' || data.cell.text[0] === 'NAMAZ BREAK')) {
          doc.setFillColor(254, 243, 199); // #fef3c7
          doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F');
          doc.setTextColor(146, 64, 14); // #92400e
          doc.setFontSize(7);
          doc.setFont('helvetica', 'bold');
          doc.text(data.cell.text[0], data.cell.x + data.cell.width/2, data.cell.y + data.cell.height/2, {
            align: 'center'
          });
        }
      }
    });

    // Get final Y position from autoTable
    const finalY = (doc as any).lastAutoTable?.finalY || 160;
    
    // Only add legend if there's space
    if (finalY < pageHeight - 40) {
      // Add legend
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0); // Black
      doc.text('Legend:', margin, finalY + 8);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.text('• Each cell: Subject | Teacher | Room', margin, finalY + 14);
      doc.text('• Breaks: 11:00-11:30 (Break), 13:10-14:00 (Namaz)', margin, finalY + 19);
      doc.text('• CSP: Max 3 slots/teacher/week, day distribution priority', margin, finalY + 24);
    }
  } else {
    // Fallback: Create a simple table manually with smaller cells
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.text('TIMETABLE', margin, 65);
    
    // Draw a simple grid with smaller cells
    let currentY = 75;
    const cellHeight = 12; // Smaller cell height
    const cellWidth = (pageWidth - margin * 2) / 6;
    
    // Draw headers
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    headers.forEach((header, index) => {
      const x = margin + (index * cellWidth);
      doc.rect(x, currentY, cellWidth, cellHeight);
      doc.text(header, x + 2, currentY + 8);
    });
    
    currentY += cellHeight;
    
    // Draw data rows
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    tableData.forEach((row) => {
      row.forEach((cell, index) => {
        const x = margin + (index * cellWidth);
        doc.rect(x, currentY, cellWidth, cellHeight);
        // Handle multi-line text with smaller spacing
        const lines = cell.split('\n');
        lines.forEach((line, lineIndex) => {
          if (lineIndex < 3) { // Limit to 3 lines
            doc.text(line, x + 1, currentY + 4 + (lineIndex * 3));
          }
        });
      });
      currentY += cellHeight;
      
      // Check if we need a new page
      if (currentY > pageHeight - 40) {
        doc.addPage();
        currentY = 20;
      }
    });
  }

  // Footer with generation info
  doc.setFillColor(241, 245, 249); // #f1f5f9
  doc.rect(0, pageHeight - 20, pageWidth, 20, 'F');
  
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.setFontSize(7);
  doc.text('Generated by AI Timetable Generator', margin, pageHeight - 12);
  doc.text('Page 1 of 1', pageWidth - margin - 15, pageHeight - 12);
  doc.text(new Date().toISOString().split('T')[0], pageWidth - margin - 40, pageHeight - 6);

  // Add institution customization area
  doc.setDrawColor(226, 232, 240); // #e2e8f0
  doc.setLineWidth(0.5);
  doc.rect(pageWidth - 60, 5, 45, 15);
  doc.setFontSize(6);
  doc.setTextColor(148, 163, 184); // #94a3b8
  doc.text('Institution Logo', pageWidth - 57, 10);
  doc.text('Area', pageWidth - 57, 14);

  // Save the PDF
  const fileName = `${timetableData.name.replace(/[^a-zA-Z0-9]/g, '_')}_Timetable.pdf`;
  doc.save(fileName);
}

// Utility function to format time periods for display
export function formatTimeSlot(timeSlot: string): string {
  return timeSlot;
}

// Utility function to get conflict summary for PDF
export function getConflictSummary(conflicts: any[]): string {
  if (conflicts.length === 0) return 'No conflicts detected';
  
  const conflictTypes = new Set();
  conflicts.forEach(conflict => {
    if (conflict.description.includes('Teacher')) conflictTypes.add('Teacher conflicts');
    if (conflict.description.includes('Room')) conflictTypes.add('Room conflicts');
    if (conflict.description.includes('Time')) conflictTypes.add('Time conflicts');
  });
  
  return Array.from(conflictTypes).join(', ');
} 