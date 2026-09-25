/* Side-effect imports: each file calls registerScreenWindows() for the
   windows its folder screen draws (see host/screen-windows.tsx), which is what
   lets the frame's openWindowById open them by name. Add a line when you add
   a file. */
import './MedicationWindows'
import './MarWindows'
import './AllergyWindows'
