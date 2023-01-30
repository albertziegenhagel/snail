
import * as vscode from 'vscode';

export let gutterDecorationType : vscode.TextEditorDecorationType;
export let hitDecorationTypes : vscode.TextEditorDecorationType[] = [];

export function initDecorations() {
    
	const hitDecorationSteps = 10;
	for(let percent = hitDecorationSteps; percent <= 100; percent += hitDecorationSteps) {
		const color = percent / 100;
		hitDecorationTypes.push(vscode.window.createTextEditorDecorationType({
			isWholeLine : true,
			backgroundColor : `rgba(255, 0, 0, ${(color*0.6).toFixed(2)})`,
			borderColor : `rgba(255, 0, 0, ${(color*0.9).toFixed(2)})`,
			borderStyle : "solid",
			borderWidth : "1px",
		}));
	}

	gutterDecorationType = vscode.window.createTextEditorDecorationType({
		isWholeLine : true,
		before : {
			margin: '0 16px 0 16px',
			textDecoration: "none;text-align: right",
		},
	});
}