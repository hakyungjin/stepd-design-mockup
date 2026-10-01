import { HOME_PROMPTS } from './promptTemplates'
import styles from './HomePage.module.css'

export function PromptLauncher({ onAsk }: { onAsk: (text: string) => void }) {
  return <section className={styles.promptSection} aria-label="추천 요청">
    <div className={styles.promptHeading}><h2>이렇게 시작해 보세요</h2><span>요청을 골라 대화로 이어가세요</span></div>
    <div className={styles.promptGrid}>
      {HOME_PROMPTS.map(template => <button key={template.id} type="button" className={styles.promptCard} data-task={template.id} onClick={() => onAsk(template.prompt)}>
        <span className={styles.promptCategory}><span className={styles.promptIcon}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={template.icon} /></svg></span>{template.label}</span>
        <strong>{template.title}</strong>
        <span className={styles.promptDetail}>{template.description}</span>
        <svg className={styles.promptArrow} width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 17 17 7M7 7h10v10" /></svg>
      </button>)}
    </div>
  </section>
}
