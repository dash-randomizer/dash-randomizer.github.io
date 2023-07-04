import styles from './numeric.module.css'
import { useEffect, useRef, useState } from 'react'

export type NumericProps = {
   minVal: number,
   maxVal: number,
   name?: string,
   register?: any,
   required?: boolean
   defaultValue?: number
}

type NumberState = 'min' | 'max' | null

const Numeric = ({
   minVal,
   maxVal,
   name = '',
   register,
   required = false,
   defaultValue = 1,
}: NumericProps) => {
   const [status, setStatus] = useState<NumberState>(null)
   const inputRef = useRef<HTMLInputElement>(null)

   useEffect(() => {
      const input = inputRef.current
      console.log('sup', input)
      
      const handleChange = () => {
         // Determine if at min or max
         const value = input?.value || '1'
         const number = parseInt(value)
         console.log('onChange', value)
         switch(true) {
            case (number >= maxVal):
               setStatus('max')
               break
            case (number <= minVal):
               setStatus('min')
               break
            default:
               setStatus(null)
         }
       };
   
       input?.addEventListener('change', handleChange)
       input?.dispatchEvent(new Event('change'))
   
       return () => {
         input?.removeEventListener('change', handleChange)
       };
   }, [minVal, maxVal, setStatus])

   return (
      <div className={styles.wrapper}>
         <div className={styles.numeric}>
            <input type="number"
               name={name} {...register(name, { required })}
               min={minVal}
               max={maxVal}
               defaultValue={defaultValue}
               ref={inputRef}
               pattern="[0-9]*"
            />
            <div>
               <button
                  className={styles.btn}
                  disabled={status === 'max'}
                  onClick={(evt) => {
                     evt.preventDefault()
                     if (inputRef?.current) {
                        inputRef.current.stepUp()
                        inputRef.current.dispatchEvent(new Event('change'))
                     }
                  }}
               >
                  up
               </button>
               <button
                  className={styles.btn}
                  disabled={status === 'min'}
                  onClick={(evt) => {
                     evt.preventDefault()
                     if (inputRef?.current) {
                        inputRef.current.stepDown()
                        inputRef.current.dispatchEvent(new Event('change'))
                     }
                  }}
               >
                  down
               </button>
            </div>
         </div>
      </div>
   )
}

export default Numeric