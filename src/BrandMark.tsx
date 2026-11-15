// User-supplied T/orbit/star logo, locally embedded and shared by shell/welcome/settings.
// Keep the legacy brand-sun CSS hook to avoid unrelated layout changes.
export function BrandMark({className='mark'}:{className?:string}){return <img className={'brand-sun '+className} src="./icon.svg" alt="" aria-hidden="true" draggable={false}/>}
